export interface StreamingAudioPlayerOptions {
  preBufferSeconds?: number;
  minBufferedSecondsBeforePlay?: number;
}

export interface StreamingAudioMetadata {
  sampleRate: number;
  channels: number;
  format: string; // Expects "pcm16"
}

export interface StreamingAudioPlayerState {
  isStarted: boolean;
  isPlaying: boolean;
  chunksQueued: number;
  chunksPlayed: number;
  scheduledTime: number;
  sampleRate: number | null;
  channels: number | null;
}

/**
 * Gapless streaming audio player using Web Audio API.
 *
 * Tiny chunks from the streaming VAE decoder are accumulated into ~0.1s
 * batches before scheduling, which reduces Web Audio API overhead and
 * prevents scheduling artifacts.
 *
 * Chunks are scheduled back-to-back on a timeline so the browser plays them
 * without gaps or overlap.  When chunks arrive too slowly and the playback
 * cursor overtakes `nextStartTime`, the player schedules the new chunk
 * almost immediately (20ms safety buffer) instead of inserting a large
 * rebuffer gap.
 *
 * A micro-crossfade (16 samples ≈ 0.3ms at 48kHz) is applied at batch
 * boundaries to eliminate clicks/pops caused by waveform discontinuities
 * from the streaming VAE decoder.
 */
export class StreamingAudioPlayer {
  private audioContext: AudioContext | null = null;
  private options: StreamingAudioPlayerOptions;
  
  private nextStartTime: number = 0;
  private metadata: StreamingAudioMetadata | null = null;
  
  private chunksQueued: number = 0;
  private chunksPlayed: number = 0;
  private sourceNodes: AudioBufferSourceNode[] = [];
  
  private pendingBuffers: AudioBuffer[] = [];
  private totalPendingDuration: number = 0;
  private hasStartedPlayback: boolean = false;

  // For boundary smoothing: keep last few samples of previous batch
  private prevTailSamples: Float32Array | null = null;

  // Number of samples to crossfade at batch boundaries to prevent clicks
  private static readonly BOUNDARY_FADE_SAMPLES = 16;

  // Accumulate tiny chunks into larger batches before scheduling
  private pendingFloat32: Float32Array[] = [];
  private pendingFloat32Length: number = 0;

  constructor(options?: StreamingAudioPlayerOptions) {
    this.options = {
      preBufferSeconds: 0.3,
      minBufferedSecondsBeforePlay: 0.3,
      ...options,
    };
  }

  public async start(metadata: StreamingAudioMetadata): Promise<void> {
    if (metadata.format !== "pcm16") {
      throw new Error(`Unsupported format: ${metadata.format}. Only "pcm16" is supported.`);
    }
    if (metadata.channels !== 1) {
      throw new Error(`Unsupported channels: ${metadata.channels}. Only mono PCM16 is supported in MVP.`);
    }

    this.metadata = metadata;
    this.resetStateVariables();

    if (!this.audioContext || this.audioContext.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass({
        sampleRate: metadata.sampleRate,
      });
    }

    // Resume context if suspended (Browser autoplay policy requires a user gesture)
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    // Initialize nextStartTime to 0 to mean "not yet scheduled anything"
    this.nextStartTime = 0;
  }

  public pushChunk(arrayBuffer: ArrayBuffer): void {
    if (!this.audioContext || !this.metadata) {
      console.warn("StreamingAudioPlayer: pushChunk called before start(). Ignoring.");
      return;
    }
    if (arrayBuffer.byteLength === 0) {
      return;
    }

    // Convert PCM16 little-endian to Float32Array
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    // Accumulate Float32Arrays instead of scheduling immediately
    this.pendingFloat32.push(float32Array);
    this.pendingFloat32Length += float32Array.length;

    // Flush if we have at least 0.1 seconds of audio accumulated
    const minSamples = this.metadata.sampleRate * 0.1;
    if (this.pendingFloat32Length >= minSamples) {
      this.flushPendingFloat32();
    }
  }

  public flush(): void {
    if (this.pendingFloat32Length > 0) {
      this.flushPendingFloat32(true);
      return;
    }
    // Drain any tail that was withheld from the previous batch for
    // crossfading. Without this it would never be played.
    if (this.prevTailSamples && this.audioContext && this.metadata) {
      const tail = this.prevTailSamples;
      this.prevTailSamples = null;
      this.scheduleSamples(tail);
    }
  }

  private flushPendingFloat32(isFinal: boolean = false): void {
    if (!this.audioContext || !this.metadata || this.pendingFloat32Length === 0) return;

    // Concatenate accumulated float32 arrays into one batch
    const combined = new Float32Array(this.pendingFloat32Length);
    let offset = 0;
    for (const arr of this.pendingFloat32) {
      combined.set(arr, offset);
      offset += arr.length;
    }

    this.pendingFloat32 = [];
    this.pendingFloat32Length = 0;

    const fadeLen = StreamingAudioPlayer.BOUNDARY_FADE_SAMPLES;

    // Build the playable buffer. If the previous flush withheld a tail
    // for crossfading, do a true equal-length crossfade between that
    // tail (fade-out) and the head of this batch (fade-in). Because the
    // tail was never scheduled, this avoids the temporal-backwards-jump
    // problem of blending samples that have already been played.
    let playable: Float32Array<ArrayBuffer>;
    if (this.prevTailSamples && this.prevTailSamples.length > 0) {
      const tailLen = this.prevTailSamples.length;
      if (combined.length >= tailLen) {
        playable = new Float32Array(combined.length);
        for (let i = 0; i < tailLen; i++) {
          const t = (i + 1) / (tailLen + 1); // 0→1 ramp
          playable[i] = this.prevTailSamples[i] * (1 - t) + combined[i] * t;
        }
        playable.set(combined.subarray(tailLen), tailLen);
      } else {
        // The new batch is shorter than the held-back tail — just
        // concatenate to keep continuity; no crossfade is possible.
        playable = new Float32Array(tailLen + combined.length);
        playable.set(this.prevTailSamples, 0);
        playable.set(combined, tailLen);
      }
      this.prevTailSamples = null;
    } else {
      playable = combined;
    }

    // Withhold the last fadeLen samples for the next batch's crossfade.
    // Skip on the final flush so the audio actually plays out fully.
    // `slice` (rather than subarray) is used so the buffers are detached
    // copies and satisfy the strict Float32Array<ArrayBuffer> typing of
    // AudioBuffer.copyToChannel.
    let toSchedule: Float32Array<ArrayBuffer>;
    if (!isFinal && playable.length > fadeLen) {
      toSchedule = playable.slice(0, playable.length - fadeLen);
      this.prevTailSamples = playable.slice(playable.length - fadeLen);
    } else {
      toSchedule = playable;
      this.prevTailSamples = null;
    }

    if (toSchedule.length === 0) return;

    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(
      this.metadata.channels,
      toSchedule.length,
      this.metadata.sampleRate
    );

    // Copy to channel 0 (mono)
    audioBuffer.copyToChannel(toSchedule, 0);

    if (!this.hasStartedPlayback) {
      this.pendingBuffers.push(audioBuffer);
      this.totalPendingDuration += audioBuffer.duration;
      
      const minBuffer = this.options.minBufferedSecondsBeforePlay || 0.3;
      if (this.totalPendingDuration >= minBuffer) {
        this.hasStartedPlayback = true;
        this.nextStartTime = this.audioContext.currentTime + (this.options.preBufferSeconds || 0.3);
        for (const buf of this.pendingBuffers) {
          this.scheduleBuffer(buf);
        }
        this.pendingBuffers = [];
      }
    } else {
      const currentTime = this.audioContext.currentTime;
      if (this.nextStartTime < currentTime) {
        // Buffer underrun — schedule almost immediately instead of large gap
        this.nextStartTime = currentTime + 0.02;
      }
      this.scheduleBuffer(audioBuffer);
    }
    
    this.chunksQueued++;
  }

  private scheduleBuffer(audioBuffer: AudioBuffer): void {
    if (!this.audioContext) return;
    
    // Create Source Node — connect directly, no overlap
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(this.audioContext.destination);

    // Track for stopping later
    this.sourceNodes.push(sourceNode);

    sourceNode.onended = () => {
      this.chunksPlayed++;
      const idx = this.sourceNodes.indexOf(sourceNode);
      if (idx !== -1) {
        this.sourceNodes.splice(idx, 1);
      }
    };

    // Schedule back-to-back for gapless playback
    sourceNode.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }

  private scheduleSamples(samples: Float32Array): void {
    if (!this.audioContext || !this.metadata || samples.length === 0) return;
    // Copy into a fresh Float32Array<ArrayBuffer> so it satisfies the
    // strict type of copyToChannel (it doesn't accept SharedArrayBuffer).
    const owned = new Float32Array(samples.length);
    owned.set(samples);
    const audioBuffer = this.audioContext.createBuffer(
      this.metadata.channels,
      owned.length,
      this.metadata.sampleRate,
    );
    audioBuffer.copyToChannel(owned, 0);
    if (this.hasStartedPlayback) {
      const currentTime = this.audioContext.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.02;
      }
      this.scheduleBuffer(audioBuffer);
    } else {
      this.pendingBuffers.push(audioBuffer);
      this.totalPendingDuration += audioBuffer.duration;
    }
  }

  public stop(): void {
    if (this.audioContext) {
      for (const node of this.sourceNodes) {
        try {
          node.stop();
        } catch {
          // Ignore if already stopped
        }
      }
    }
    this.resetStateVariables();
  }

  public reset(): void {
    this.stop();
  }

  public async close(): Promise<void> {
    this.stop();
    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }
    this.audioContext = null;
    this.metadata = null;
  }

  public getState(): StreamingAudioPlayerState {
    const isStarted = this.metadata !== null && this.audioContext !== null;
    let isPlaying = false;
    let scheduledTime = 0;
    
    if (isStarted && this.audioContext) {
      isPlaying = this.sourceNodes.length > 0;
      scheduledTime = Math.max(0, this.nextStartTime - this.audioContext.currentTime);
    }

    return {
      isStarted,
      isPlaying,
      chunksQueued: this.chunksQueued,
      chunksPlayed: this.chunksPlayed,
      scheduledTime,
      sampleRate: this.metadata?.sampleRate || null,
      channels: this.metadata?.channels || null,
    };
  }

  private resetStateVariables(): void {
    this.sourceNodes = [];
    this.chunksQueued = 0;
    this.chunksPlayed = 0;
    this.nextStartTime = 0;
    this.pendingBuffers = [];
    this.totalPendingDuration = 0;
    this.hasStartedPlayback = false;
    this.prevTailSamples = null;
    this.pendingFloat32 = [];
    this.pendingFloat32Length = 0;
  }
}
