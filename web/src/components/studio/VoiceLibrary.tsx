"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, Mic, Play, Pause, Trash2, Download, Edit3, Check, X,
  Loader2, AlertTriangle, ChevronLeft, ChevronRight, FileAudio, Copy, Zap,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { useVoiceSelection } from "@/lib/stores/voice-selection";

// ---------------------------------------------------------------------------
// WAV encoder — turns raw PCM Float32 channel data into a WAV ArrayBuffer
// ---------------------------------------------------------------------------
function encodeWav(
  channelData: Float32Array[],
  sampleRate: number,
  numChannels: number,
): ArrayBuffer {
  const samples = channelData[0].length;
  const bytesPerSample = 2; // 16-bit PCM
  const dataSize = samples * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(view, 8, "WAVE");

  // fmt sub-chunk
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);

  // data sub-chunk
  writeStr(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave channels and write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channelData[ch][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return buffer;
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface VoiceProfile {
  id: string;
  name: string;
  fileName: string;
  audioUrl: string;
  fileSize: number;
  mimeType: string;
  description: string;
  featureUrl: string | null;
  voxcpmVersion: string | null;
  vaeVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse {
  items: VoiceProfile[];
  total: number;
  page: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function VoiceLibrary() {
  const router = useRouter();
  const setSelected = useVoiceSelection((s) => s.setSelected);
  const selectedVoice = useVoiceSelection((s) => s.selected);
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limit = 12;

  // ---- Fetch voices ----
  const fetchVoices = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/voices?page=${p}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch voices");
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVoices(page);
  }, [page, fetchVoices]);

  // ---- Trim audio to max duration using Web Audio API ----
  const MAX_AUDIO_SECONDS = 7;

  const trimAudioToWav = useCallback(async (file: File): Promise<File> => {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new AudioContext();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();

    const duration = decoded.duration;
    if (duration <= MAX_AUDIO_SECONDS) {
      return file; // No trimming needed
    }

    // Trim to MAX_AUDIO_SECONDS
    const sampleRate = decoded.sampleRate;
    const maxSamples = Math.floor(MAX_AUDIO_SECONDS * sampleRate);
    const channels = decoded.numberOfChannels;

    // Extract channel data (trimmed)
    const channelData: Float32Array[] = [];
    for (let ch = 0; ch < channels; ch++) {
      channelData.push(decoded.getChannelData(ch).slice(0, maxSamples));
    }

    // Encode as WAV
    const wavBuffer = encodeWav(channelData, sampleRate, channels);
    const trimmedName = file.name.replace(/\.[^.]+$/, "") + "_trimmed.wav";
    return new File([wavBuffer], trimmedName, { type: "audio/wav" });
  }, []);

  // ---- Upload voice ----
  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      alert("Please select an audio file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File must be under 10MB");
      return;
    }

    const name = prompt("Enter a name for this voice:", file.name.replace(/\.[^.]+$/, ""));
    if (!name) return;

    setUploading(true);
    setUploadProgress("Processing audio…");
    try {
      // Trim audio to max 7 seconds
      const trimmedFile = await trimAudioToWav(file);

      setUploadProgress("Uploading…");
      const formData = new FormData();
      formData.append("file", trimmedFile);
      formData.append("name", name);
      formData.append("description", "");

      const res = await fetch("/api/voices", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Upload failed");
      }

      setUploadProgress("Done!");
      setPage(1);
      await fetchVoices(1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  // ---- Audio playback ----
  const togglePlay = (item: VoiceProfile) => {
    if (playingId === item.id) {
      audioEl?.pause();
      setPlayingId(null);
      return;
    }

    if (audioEl) audioEl.pause();

    const audio = new Audio(item.audioUrl);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play();
    setAudioEl(audio);
    setPlayingId(item.id);
  };

  // ---- Use voice in Studio ----
  const handleUseVoice = (item: VoiceProfile) => {
    setSelected({
      id: item.id,
      name: item.name,
      audioUrl: item.audioUrl,
      featureUrl: item.featureUrl ?? null,
      voxcpmVersion: item.voxcpmVersion ?? null,
    });
    router.push("/studio");
  };

  // ---- Delete ----
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this voice profile?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/voices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      if (selectedVoice?.id === id) setSelected(null);
      await fetchVoices(page);
    } catch {
      alert("Failed to delete. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // ---- Edit ----
  const startEdit = (item: VoiceProfile) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDescription(item.description);
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/voices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDescription }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingId(null);
      await fetchVoices(page);
    } catch {
      alert("Failed to update. Please try again.");
    }
  };

  // ---- Copy URL ----
  const copyUrl = async (item: VoiceProfile) => {
    try {
      await navigator.clipboard.writeText(item.audioUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert("Failed to copy URL");
    }
  };

  // ---- Format size ----
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  // ========================== RENDER ==========================

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={32} className="animate-spin text-vox-primary" />
        <p className="text-sm text-vox-text-dim">Loading voice library…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-6 rounded-xl flex items-start gap-3">
        <AlertTriangle size={20} className="text-red-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-red-400">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Upload Zone */}
      <GlassCard className="!p-0 overflow-hidden">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleUpload(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 text-center cursor-pointer transition-all group ${
            uploading
              ? "bg-vox-primary/5 pointer-events-none"
              : "hover:bg-vox-surface-high/50"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin text-vox-primary" />
              <p className="text-sm text-vox-text">{uploadProgress}</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-vox-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-vox-primary/20 transition-colors">
                <Upload size={28} className="text-vox-primary" />
              </div>
              <p className="text-sm text-vox-text font-medium">
                Drop an audio file here or <span className="text-vox-secondary underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-vox-text-dim mt-1">
                WAV, MP3, FLAC — max 10MB · auto-trimmed to 7s
              </p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
      </GlassCard>

      {/* Voice count */}
      {data && data.total > 0 && (
        <p className="text-sm text-vox-text-dim">
          {data.total} voice{data.total !== 1 ? "s" : ""} in your library
        </p>
      )}

      {/* Voice Grid */}
      {!data || data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-vox-surface flex items-center justify-center mb-4">
            <Mic size={32} className="text-vox-text-dim opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-vox-heading mb-2">No Voices Yet</h3>
          <p className="text-sm text-vox-text-dim max-w-md">
            Upload your first voice reference to start building your voice library.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((item) => (
            <GlassCard
              key={item.id}
              className="!p-0 overflow-hidden hover:border-vox-primary/30 transition-all group"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-vox-outline/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vox-primary/20 to-vox-secondary/20 flex items-center justify-center shrink-0">
                    <FileAudio size={20} className="text-vox-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === item.id ? (
                      <input
                        className="w-full bg-vox-surface-lowest border border-vox-outline/30 rounded-lg px-2 py-1 text-sm text-vox-text outline-none focus:border-vox-primary"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <h4 className="text-sm font-medium text-vox-heading truncate">{item.name}</h4>
                    )}
                    <p className="text-xs text-vox-text-dim mt-0.5">{item.fileName} · {formatSize(item.fileSize)}</p>
                  </div>
                </div>

                {editingId === item.id && (
                  <textarea
                    className="w-full mt-2 bg-vox-surface-lowest border border-vox-outline/30 rounded-lg px-2 py-1 text-xs text-vox-text outline-none focus:border-vox-primary resize-none"
                    placeholder="Description (optional)"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                  />
                )}

                {item.description && editingId !== item.id && (
                  <p className="text-xs text-vox-text-dim mt-2 line-clamp-2">{item.description}</p>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-[10px] text-vox-text-dim">{formatDate(item.createdAt)}</span>
                <div className="flex items-center gap-1">
                  {editingId === item.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(item.id)}
                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleUseVoice(item)}
                        className="px-2 py-1 rounded-md bg-vox-secondary/20 hover:bg-vox-secondary/30 text-xs flex items-center gap-1 text-vox-secondary transition-colors"
                        title="Use this voice in Studio"
                      >
                        <Mic size={12} /> Use
                      </button>
                      {item.featureUrl && (
                        <span className="text-amber-400" title="Feature cached">
                          <Zap size={12} />
                        </span>
                      )}
                      <button
                        onClick={() => togglePlay(item)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          playingId === item.id
                            ? "text-vox-primary bg-vox-primary/10"
                            : "text-vox-text-dim hover:text-vox-primary hover:bg-vox-primary/10"
                        }`}
                        title={playingId === item.id ? "Pause" : "Play"}
                      >
                        {playingId === item.id ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button
                        onClick={() => copyUrl(item)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          copiedId === item.id
                            ? "text-emerald-400 bg-emerald-500/10"
                            : "text-vox-text-dim hover:text-vox-secondary hover:bg-vox-secondary/10"
                        }`}
                        title={copiedId === item.id ? "Copied!" : "Copy URL"}
                      >
                        {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      <a
                        href={item.audioUrl}
                        download
                        className="p-1.5 rounded-lg text-vox-text-dim hover:text-vox-secondary hover:bg-vox-surface transition-colors"
                        title="Download"
                      >
                        <Download size={14} />
                      </a>
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 rounded-lg text-vox-text-dim hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="p-1.5 rounded-lg text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === item.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm text-vox-text-dim hover:text-vox-heading bg-vox-surface rounded-lg border border-vox-outline/20 transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-vox-text-dim px-3">
            Page <span className="text-vox-heading font-medium">{data.page}</span> of{" "}
            <span className="text-vox-heading font-medium">{data.totalPages}</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm text-vox-text-dim hover:text-vox-heading bg-vox-surface rounded-lg border border-vox-outline/20 transition-colors disabled:opacity-30"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
