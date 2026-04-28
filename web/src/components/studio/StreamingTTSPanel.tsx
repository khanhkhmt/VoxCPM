"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TTSStreamingClient,
  TTSStreamRequest,
  TTSStreamStartMetadata,
  TTSStreamDonePayload,
  buildFullHttpUrl,
} from "@/lib/tts-stream";
import { StreamingAudioPlayer } from "@/lib/audio/streaming-audio-player";

export type StreamingTTSPanelProps = {
  text: string;
  controlInstruction?: string;
  usePromptText?: boolean;
  promptText?: string;
  cfgValue: number;
  doNormalize: boolean;
  denoise: boolean;
  ditSteps: number;
  language: string;
  referenceAudioFile?: File | null;
  activeVoiceProfileId?: string | null;
  finalAudioUrl?: string | null;
  onDone?: (audioUrl: string) => void;
};

type StreamStatus =
  | "idle"
  | "connecting"
  | "generating"
  | "playing"
  | "done"
  | "error"
  | "cancelled";

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip out the data:audio/wav;base64, prefix
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function StreamingTTSPanel({
  text,
  controlInstruction = "",
  usePromptText = false,
  promptText = "",
  cfgValue,
  doNormalize,
  denoise,
  ditSteps,
  language,
  referenceAudioFile,
  finalAudioUrl: externalFinalAudioUrl,
  onDone,
}: StreamingTTSPanelProps) {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [chunksReceived, setChunksReceived] = useState<number>(0);
  const [ttfbMs, setTtfbMs] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);
  
  const [strategy, setStrategy] = useState<"stable" | "fast">("stable");
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);
  const [totalSegments, setTotalSegments] = useState<number>(0);
  const [currentSegmentText, setCurrentSegmentText] = useState<string>("");

  useEffect(() => {
    if (externalFinalAudioUrl) {
      setFinalAudioUrl(externalFinalAudioUrl);
    }
  }, [externalFinalAudioUrl]);

  const clientRef = useRef<TTSStreamingClient | null>(null);
  const playerRef = useRef<StreamingAudioPlayer | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopAndCleanup = () => {
    if (clientRef.current) {
      clientRef.current.stop();
    }
    if (playerRef.current) {
      playerRef.current.close();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Note: Autoplay policy requires user gesture. We create the player on click,
  // or inside a user-triggered function. We init here just to have the ref ready,
  // but we only call start() when the user clicks 'Start'.
  useEffect(() => {
    return () => {
      stopAndCleanup();
    };
  }, []);

  const handleStart = async () => {
    if (!text.trim()) {
      setErrorMsg("Please input text to synthesize.");
      setStatus("error");
      return;
    }

    // Reset states
    setStatus("connecting");
    setErrorMsg("");
    setChunksReceived(0);
    setTtfbMs(0);
    setElapsedTime(0);
    setFinalAudioUrl(null);
    setCurrentSegmentIndex(0);
    setTotalSegments(0);
    setCurrentSegmentText("");
    startTimeRef.current = Date.now();

    // Start timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current);
    }, 100);

    // Re-create the player to ensure a fresh AudioContext tied to this user gesture
    if (playerRef.current) {
      await playerRef.current.close();
    }
    playerRef.current = new StreamingAudioPlayer({
      preBufferSeconds: 0.8,
      minBufferedSecondsBeforePlay: 0.8
    });

    // Handle reference audio
    let base64: string | null = null;
    if (referenceAudioFile) {
      // Check size (e.g., max 3.5MB to fit in typical websocket frame limits comfortably)
      if (referenceAudioFile.size > 3.5 * 1024 * 1024) {
        setErrorMsg("Reference audio is too large. Max 3.5MB.");
        setStatus("error");
        clearInterval(timerRef.current);
        return;
      }
      try {
        base64 = await fileToBase64(referenceAudioFile);
      } catch {
        setErrorMsg("Failed to read reference audio file.");
        setStatus("error");
        clearInterval(timerRef.current);
        return;
      }
    }

    const request: TTSStreamRequest = {
      type: "start",
      streaming_mode: strategy,
      text,
      control_instruction: controlInstruction,
      use_prompt_text: usePromptText,
      prompt_text: promptText,
      cfg_value: cfgValue,
      do_normalize: doNormalize,
      denoise,
      dit_steps: Math.min(ditSteps, 4),
      language,
      reference_wav_base64: base64,
    };

    clientRef.current = new TTSStreamingClient({
      onOpen: () => {
        setStatus("generating");
      },
      onStart: async (metadata: TTSStreamStartMetadata) => {
        setStatus("playing");
        setTtfbMs(Date.now() - startTimeRef.current);
        if (metadata.segments) {
          setTotalSegments(metadata.segments);
        }
        if (playerRef.current) {
          try {
            await playerRef.current.start({
              sampleRate: metadata.sample_rate,
              channels: metadata.channels,
              format: metadata.format,
            });
          } catch (e: unknown) {
            console.error("Audio player failed to start:", e);
            setErrorMsg("Audio playback error: " + (e instanceof Error ? e.message : String(e)));
            setStatus("error");
          }
        }
      },
      onSegmentStart: (payload) => {
        setCurrentSegmentIndex(payload.index + 1);
        setCurrentSegmentText(payload.text);
      },
      onAudioChunk: (arrayBuffer: ArrayBuffer) => {
        if (playerRef.current) {
          playerRef.current.pushChunk(arrayBuffer);
        }
        setChunksReceived((prev) => prev + 1);
      },
      onDone: (payload: TTSStreamDonePayload) => {
        setStatus("done");
        const fullAudioUrl = buildFullHttpUrl(payload.audio_url);
        setFinalAudioUrl(fullAudioUrl);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // Expose the final audio URL upward so the parent Workspace can handle History logic
        if (onDone) {
          onDone(fullAudioUrl);
        }
      },
      onError: (message: string) => {
        setStatus("error");
        setErrorMsg(message);
        if (timerRef.current) clearInterval(timerRef.current);
        if (playerRef.current) playerRef.current.stop();
      },
      onCancelled: () => {
        setStatus("cancelled");
        if (timerRef.current) clearInterval(timerRef.current);
        if (playerRef.current) playerRef.current.stop();
      },
      onClose: () => {
        if (timerRef.current) clearInterval(timerRef.current);
      },
    });

    try {
      clientRef.current.connect(request);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg("Failed to connect: " + (err instanceof Error ? err.message : String(err)));
      clearInterval(timerRef.current);
    }
  };

  const handleStop = () => {
    stopAndCleanup();
    setStatus("cancelled");
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {(status === "connecting" || status === "generating" || status === "playing") && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
              status === "playing" ? "bg-green-500" :
              status === "error" ? "bg-red-500" :
              status === "generating" || status === "connecting" ? "bg-blue-500" :
              status === "done" ? "bg-gray-400" :
              "bg-gray-300 dark:bg-gray-600"
            }`}></span>
          </span>
          Streaming Mode
        </h3>
        <span
          className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full ${
            status === "playing"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : status === "error"
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : status === "generating" || status === "connecting"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : status === "done"
              ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {status}
        </span>
      </div>
      
      <div className="text-[11px] text-gray-500 font-medium -mt-2">
        Streaming Mode is optimized with lower steps for smoother real-time playback.
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mt-1 mb-1">
        <button
          onClick={() => setStrategy("stable")}
          disabled={status !== "idle" && status !== "done" && status !== "error" && status !== "cancelled"}
          className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-all ${strategy === "stable" ? "bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600" : "hover:bg-gray-200 dark:hover:bg-gray-700/50"} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Stable / Smooth</span>
          <span className="text-[10px] text-gray-500">More stable, sends audio by sentence</span>
        </button>
        <button
          onClick={() => setStrategy("fast")}
          disabled={status !== "idle" && status !== "done" && status !== "error" && status !== "cancelled"}
          className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-all ${strategy === "fast" ? "bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600" : "hover:bg-gray-200 dark:hover:bg-gray-700/50"} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Fast / Low-latency</span>
          <span className="text-[10px] text-gray-500">Starts earlier, may stutter on weak GPU</span>
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleStart}
          disabled={status === "connecting" || status === "generating" || status === "playing"}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
        >
          {status === "connecting" || status === "generating" ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : (
            "Start Streaming"
          )}
        </button>
        <button
          onClick={handleStop}
          disabled={status === "idle" || status === "done" || status === "error" || status === "cancelled"}
          className="bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-medium py-2.5 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-red-200 dark:border-red-800/30"
        >
          Stop
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Elapsed</span>
          <span className="font-mono text-lg text-gray-700 dark:text-gray-200">
            {(elapsedTime / 1000).toFixed(1)}<span className="text-sm text-gray-400">s</span>
          </span>
        </div>
        <div className="flex flex-col bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">TTFB</span>
          <span className="font-mono text-lg text-gray-700 dark:text-gray-200">
            {ttfbMs > 0 ? ttfbMs : "-"}<span className="text-sm text-gray-400">{ttfbMs > 0 ? "ms" : ""}</span>
          </span>
        </div>
        <div className="flex flex-col bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {strategy === "stable" ? "Segments" : "Chunks"}
          </span>
          <span className="font-mono text-lg text-gray-700 dark:text-gray-200">
            {strategy === "stable" && totalSegments > 0 ? `${currentSegmentIndex} / ${totalSegments}` : chunksReceived}
          </span>
        </div>
      </div>
      
      {status === "playing" && strategy === "stable" && currentSegmentText && (
        <div className="text-xs text-gray-500 italic text-center animate-pulse px-2 line-clamp-2">
          Generating: &quot;{currentSegmentText}&quot;
        </div>
      )}

      {status === "error" && errorMsg && (
        <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800/30 flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {errorMsg}
        </div>
      )}

      {status === "done" && finalAudioUrl && (
        <div className="mt-2 flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Final Audio Replay</span>
          <audio controls src={finalAudioUrl} className="w-full h-10" />
        </div>
      )}
    </div>
  );
}
