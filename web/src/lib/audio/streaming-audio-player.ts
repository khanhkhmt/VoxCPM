export interface StreamingAudioPlayerOptions {
  preBufferSeconds?: number;
  minBufferedSecondsBeforePlay?: number;
  overlapSeconds?: number;
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
  private isFirstScheduled: boolean = true;
  private prevGainNode: GainNode | null = null;

  // New properties for accumulating tiny chunks
  private pendingFloat32: Float32Array[] = [];
  private pendingFloat32Length: number = 0;

  constructor(options?: StreamingAudioPlayerOptions) {
    this.options = {
      preBufferSeconds: 0.8,
      minBufferedSecondsBeforePlay: 0.8,
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
      // Int16 values are in range [-32768, 32767]
      // Float32 values should be in range [-1.0, 1.0]
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
      this.flushPendingFloat32();
    }
  }

  private flushPendingFloat32(): void {
    if (!this.audioContext || !this.metadata || this.pendingFloat32Length === 0) return;

    // Concatenate accumulated float32 arrays
    const combined = new Float32Array(this.pendingFloat32Length);
    let offset = 0;
    for (const arr of this.pendingFloat32) {
      combined.set(arr, offset);
      offset += arr.length;
    }
    
    this.pendingFloat32 = [];
    this.pendingFloat32Length = 0;

    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(
      this.metadata.channels,
      combined.length,
      this.metadata.sampleRate
    );

    // Copy to channel 0 (mono)
    audioBuffer.copyToChannel(combined, 0);

    if (!this.hasStartedPlayback) {
      this.pendingBuffers.push(audioBuffer);
      this.totalPendingDuration += audioBuffer.duration;
      
      const minBuffer = this.options.minBufferedSecondsBeforePlay || 0.8;
      if (this.totalPendingDuration >= minBuffer) {
        this.hasStartedPlayback = true;
        this.nextStartTime = this.audioContext.currentTime + (this.options.preBufferSeconds || 0.8);
        for (const buf of this.pendingBuffers) {
          this.scheduleBuffer(buf);
        }
        this.pendingBuffers = [];
      }
    } else {
      const currentTime = this.audioContext.currentTime;
      if (this.nextStartTime < currentTime) {
        // Buffer underrun! The network/backend couldn't keep up.
        // Previously, this added preBufferSeconds (0.8s) of silence, causing unnatural word splitting.
        // Now, we schedule it to play almost immediately.
        this.nextStartTime = currentTime + 0.02;
      }
      this.scheduleBuffer(audioBuffer);
    }
    
    this.chunksQueued++;
  }

  private scheduleBuffer(audioBuffer: AudioBuffer): void {
    if (!this.audioContext) return;

    const overlap = this.options.overlapSeconds || 0;
    // Cap overlap to at most 50% of chunk duration to avoid fully overlapping short chunks
    const effectiveOverlap = Math.min(overlap, audioBuffer.duration * 0.5);
    const startTime = this.nextStartTime;
    const endTime = startTime + audioBuffer.duration;
    
    // Create Source Node with GainNode for crossfade
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    const gainNode = this.audioContext.createGain();
    sourceNode.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Apply crossfade when overlap is enabled
    if (effectiveOverlap > 0) {
      if (!this.isFirstScheduled) {
        // Fade-in: ramp from 0 to 1 over the overlap period
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(1, startTime + effectiveOverlap);
      }

      // Fade-out the previous chunk's gain during the overlap region
      if (this.prevGainNode && !this.isFirstScheduled) {
        this.prevGainNode.gain.setValueAtTime(1, startTime);
        this.prevGainNode.gain.linearRampToValueAtTime(0, startTime + effectiveOverlap);
      }

      this.prevGainNode = gainNode;
    }

    this.isFirstScheduled = false;

    // Track for stopping later
    this.sourceNodes.push(sourceNode);

    sourceNode.onended = () => {
      this.chunksPlayed++;
      // Remove from sourceNodes array
      const idx = this.sourceNodes.indexOf(sourceNode);
      if (idx !== -1) {
        this.sourceNodes.splice(idx, 1);
      }
    };

    sourceNode.start(startTime);

    // Next chunk starts `effectiveOverlap` seconds before this one ends
    this.nextStartTime = endTime - effectiveOverlap;
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
    this.isFirstScheduled = true;
    this.prevGainNode = null;
    this.pendingFloat32 = [];
    this.pendingFloat32Length = 0;
  }
}
