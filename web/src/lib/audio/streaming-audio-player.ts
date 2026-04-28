export interface StreamingAudioPlayerOptions {
  preBufferSeconds?: number;
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

  constructor(options?: StreamingAudioPlayerOptions) {
    this.options = {
      preBufferSeconds: 0.1, // default pre-buffer 100ms
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

    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(
      this.metadata.channels,
      float32Array.length,
      this.metadata.sampleRate
    );

    // Copy to channel 0 (mono)
    audioBuffer.copyToChannel(float32Array, 0);

    // Create Source Node
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(this.audioContext.destination);

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

    // Schedule playback
    const currentTime = this.audioContext.currentTime;
    
    if (this.nextStartTime === 0) {
      // First chunk: add pre-buffer to give network a head start
      this.nextStartTime = currentTime + (this.options.preBufferSeconds || 0.1);
    } else {
      // Ensure we don't schedule in the past if network lagged
      this.nextStartTime = Math.max(currentTime, this.nextStartTime);
    }

    sourceNode.start(this.nextStartTime);
    
    // Increment nextStartTime by the exact duration of this chunk
    this.nextStartTime += audioBuffer.duration;
    this.chunksQueued++;
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
  }
}
