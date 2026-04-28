export interface TTSStreamRequest {
  type: "start";
  text: string;
  control_instruction: string;
  use_prompt_text: boolean;
  prompt_text: string;
  cfg_value: number;
  do_normalize: boolean;
  denoise: boolean;
  dit_steps: number;
  language: string;
  reference_wav_base64?: string | null;
}

export interface TTSStreamStartMetadata {
  type: "start";
  sample_rate: number;
  format: "pcm16";
  channels: number;
}

export interface TTSStreamDonePayload {
  type: "done";
  audio_url: string;
  chunks: number;
  ttfb_ms: number;
  duration_ms: number;
}

export interface TTSStreamCallbacks {
  onOpen?: () => void;
  onStart?: (metadata: TTSStreamStartMetadata) => void;
  onAudioChunk?: (arrayBuffer: ArrayBuffer) => void;
  onDone?: (payload: TTSStreamDonePayload) => void;
  onError?: (message: string) => void;
  onCancelled?: () => void;
  onClose?: (event: CloseEvent) => void;
}

/**
 * Transforms HTTP/HTTPS base URL to WS/WSS URL for streaming.
 * Example: http://127.0.0.1:8808/api/tts -> ws://127.0.0.1:8808/ws/tts/stream
 */
export function buildStreamingWsUrl(baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_TTS_API_BASE || "http://127.0.0.1:8808/api/tts";
  try {
    const url = new URL(base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/tts/stream";
    return url.toString();
  } catch {
    throw new Error(`Failed to construct WebSocket URL from base: ${base}`);
  }
}

export function buildFullHttpUrl(audioPath: string, baseUrl?: string): string {
  if (audioPath.startsWith("http")) return audioPath;
  const base = baseUrl || process.env.NEXT_PUBLIC_TTS_API_BASE || "http://127.0.0.1:8808/api/tts";
  const origin = base.replace(/\/api\/tts\/?$/, "");
  return audioPath.startsWith("/api/tts/") ? `${origin}${audioPath}` : audioPath;
}

export class TTSStreamingClient {
  private ws: WebSocket | null = null;
  private callbacks: TTSStreamCallbacks;

  constructor(callbacks: TTSStreamCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(request: TTSStreamRequest, baseUrl?: string): void {
    if (this.ws) {
      this.stop();
    }

    const wsUrl = buildStreamingWsUrl(baseUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.callbacks.onOpen?.();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(request));
      }
    };

    this.ws.onmessage = async (event: MessageEvent) => {
      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "start":
              this.callbacks.onStart?.(data as TTSStreamStartMetadata);
              break;
            case "done":
              this.callbacks.onDone?.(data as TTSStreamDonePayload);
              break;
            case "error":
              this.callbacks.onError?.(data.message || "Unknown server error");
              break;
            case "cancelled":
              this.callbacks.onCancelled?.();
              break;
            default:
              console.warn("TTSStreamingClient: Unknown message type:", data.type);
          }
        } catch {
          console.error("TTSStreamingClient: JSON parse error");
          this.callbacks.onError?.("Invalid JSON received from server");
        }
      } else if (event.data instanceof Blob) {
        // Browser WebSocket usually returns Blob for binary data unless binaryType is changed
        const arrayBuffer = await event.data.arrayBuffer();
        this.callbacks.onAudioChunk?.(arrayBuffer);
      } else if (event.data instanceof ArrayBuffer) {
        this.callbacks.onAudioChunk?.(event.data);
      }
    };

    this.ws.onerror = (event: Event) => {
      console.error("TTSStreamingClient: WebSocket error", event);
      this.callbacks.onError?.("WebSocket connection error. Make sure the backend is running.");
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.callbacks.onClose?.(event);
      this.ws = null;
    };
  }

  public stop(): void {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
