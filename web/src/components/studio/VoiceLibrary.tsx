"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, Mic, Play, Pause, Trash2, Download, Edit3, Check, X,
  Loader2, AlertTriangle, ChevronLeft, ChevronRight, Copy, Zap, Key,
  ShieldCheck, ShieldOff, TerminalSquare,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { useVoiceSelection } from "@/lib/stores/voice-selection";
import ApiKeyCreatedModal from "@/components/studio/ApiKeyCreatedModal";

// ---------------------------------------------------------------------------
// WAV encoder
// ---------------------------------------------------------------------------
function encodeWav(channelData: Float32Array[], sampleRate: number, numChannels: number): ArrayBuffer {
  const samples = channelData[0].length;
  const bytesPerSample = 2;
  const dataSize = samples * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeStr(view, 36, "data");
  view.setUint32(40, dataSize, true);
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
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface VoiceProfile {
  id: string; name: string; fileName: string; audioUrl: string;
  fileSize: number; mimeType: string; description: string;
  featureUrl: string | null; voxcpmVersion: string | null;
  vaeVersion: string | null; createdAt: string; updatedAt: string;
}
interface PaginatedResponse { items: VoiceProfile[]; total: number; page: number; totalPages: number; }
interface ApiKeyInfo {
  id: string; prefix: string; lastFour: string; isActive: boolean;
  usageCount: number; lastUsedAt: string | null; createdAt: string;
  revokedAt: string | null; voiceProfileId: string;
}

function getVoiceStatus(voice: VoiceProfile, keyInfo: ApiKeyInfo | undefined) {
  if (keyInfo && keyInfo.isActive) return { label: "API Ready", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <ShieldCheck size={12} /> };
  if (voice.featureUrl) return { label: "Active", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: <Zap size={12} /> };
  return { label: "No API Key", color: "bg-vox-text-dim/10 text-vox-text-dim border-vox-outline/20", icon: <ShieldOff size={12} /> };
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
  const [generatingKeyForId, setGeneratingKeyForId] = useState<string | null>(null);
  const [createdKeyModal, setCreatedKeyModal] = useState<{ voiceName: string; plainKey: string } | null>(null);
  const [apiKeysMap, setApiKeysMap] = useState<Record<string, ApiKeyInfo>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limit = 12;

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/keys");
      if (!res.ok) return;
      const json = await res.json();
      if (json.ok && json.data?.keys) {
        const map: Record<string, ApiKeyInfo> = {};
        for (const k of json.data.keys) map[k.voiceProfileId] = k;
        setApiKeysMap(map);
      }
    } catch { /* supplementary */ }
  }, []);

  const fetchVoices = useCallback(async (p: number) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/voices?page=${p}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch voices");
      const json = await res.json();
      setData(json.data);
    } catch (err) { setError(err instanceof Error ? err.message : "An error occurred"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVoices(page); fetchApiKeys(); }, [page, fetchVoices, fetchApiKeys]);

  const MAX_AUDIO_SECONDS = 7;
  const trimAudioToWav = useCallback(async (file: File): Promise<File> => {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new AudioContext();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();
    if (decoded.duration <= MAX_AUDIO_SECONDS) return file;
    const sampleRate = decoded.sampleRate;
    const maxSamples = Math.floor(MAX_AUDIO_SECONDS * sampleRate);
    const channels = decoded.numberOfChannels;
    const channelData: Float32Array[] = [];
    for (let ch = 0; ch < channels; ch++) channelData.push(decoded.getChannelData(ch).slice(0, maxSamples));
    const wavBuffer = encodeWav(channelData, sampleRate, channels);
    return new File([wavBuffer], file.name.replace(/\.[^.]+$/, "") + "_trimmed.wav", { type: "audio/wav" });
  }, []);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("audio/")) { alert("Please select an audio file"); return; }
    if (file.size > 10 * 1024 * 1024) { alert("File must be under 10MB"); return; }
    const name = prompt("Enter a name for this voice:", file.name.replace(/\.[^.]+$/, ""));
    if (!name) return;
    setUploading(true); setUploadProgress("Processing audio\u2026");
    try {
      const trimmedFile = await trimAudioToWav(file);
      setUploadProgress("Uploading\u2026");
      const formData = new FormData();
      formData.append("file", trimmedFile); formData.append("name", name); formData.append("description", "");
      const res = await fetch("/api/voices", { method: "POST", body: formData });
      if (!res.ok) { const json = await res.json(); throw new Error(json.error?.message || "Upload failed"); }
      setUploadProgress("Done!"); setPage(1); await fetchVoices(1);
    } catch (err) { alert(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); setUploadProgress(""); }
  };

  const togglePlay = (item: VoiceProfile) => {
    if (playingId === item.id) { audioEl?.pause(); setPlayingId(null); return; }
    if (audioEl) audioEl.pause();
    const audio = new Audio(item.audioUrl);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play(); setAudioEl(audio); setPlayingId(item.id);
  };

  const handleUseVoice = (item: VoiceProfile) => {
    setSelected({ id: item.id, name: item.name, audioUrl: item.audioUrl, featureUrl: item.featureUrl ?? null, voxcpmVersion: item.voxcpmVersion ?? null });
    router.push("/studio");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this voice profile? This will also remove its API key.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/voices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      if (selectedVoice?.id === id) setSelected(null);
      await fetchVoices(page); await fetchApiKeys();
    } catch { alert("Failed to delete. Please try again."); }
    finally { setDeletingId(null); }
  };

  const startEdit = (item: VoiceProfile) => { setEditingId(item.id); setEditName(item.name); setEditDescription(item.description); };
  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/voices/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, description: editDescription }) });
      if (!res.ok) throw new Error("Failed to update");
      setEditingId(null); await fetchVoices(page);
    } catch { alert("Failed to update. Please try again."); }
  };

  const copyMaskedKey = async (keyInfo: ApiKeyInfo) => {
    const masked = `vc_sk_live_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022${keyInfo.lastFour}`;
    try { await navigator.clipboard.writeText(masked); setCopiedId(keyInfo.voiceProfileId); setTimeout(() => setCopiedId(null), 2000); }
    catch { alert("Failed to copy"); }
  };

  const formatSize = (bytes: number) => { if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`; return `${(bytes / 1048576).toFixed(1)} MB`; };
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatRelativeDate = (iso: string | null) => {
    if (!iso) return "Never";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now"; if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(iso);
  };

  const handleGenerateApiKey = async (voiceId: string, voiceName: string) => {
    setGeneratingKeyForId(voiceId);
    try {
      const res = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voiceProfileId: voiceId }) });
      const json = await res.json();
      if (json.ok) { setCreatedKeyModal({ voiceName, plainKey: json.data.plainKey }); await fetchApiKeys(); }
      else { alert(json.error?.message || "Failed to generate API key"); }
    } catch (err) { console.error("Failed to generate API key", err); alert("Failed to generate API key"); }
    finally { setGeneratingKeyForId(null); }
  };

  // ========================== RENDER ==========================
  if (loading && !data) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 size={32} className="animate-spin text-vox-primary" />
      <p className="text-sm text-vox-text-dim">Loading voice library&hellip;</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-6 rounded-xl flex items-start gap-3">
      <AlertTriangle size={20} className="text-red-400 mt-0.5 shrink-0" />
      <div><p className="font-semibold text-red-400">Error</p><p className="text-sm">{error}</p></div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {createdKeyModal && <ApiKeyCreatedModal voiceName={createdKeyModal.voiceName} plainKey={createdKeyModal.plainKey} onClose={() => setCreatedKeyModal(null)} />}

      {/* Upload Zone */}
      <GlassCard className="!p-0 overflow-hidden">
        <div onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) handleUpload(file); }}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 text-center cursor-pointer transition-all group ${uploading ? "bg-vox-primary/5 pointer-events-none" : "hover:bg-vox-surface-high/50"}`}>
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
              <p className="text-sm text-vox-text font-medium">Drop an audio file here or <span className="text-vox-secondary underline underline-offset-2">browse</span></p>
              <p className="text-xs text-vox-text-dim mt-1">WAV, MP3, FLAC &mdash; max 10MB &middot; auto-trimmed to 7s</p>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="audio/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
      </GlassCard>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-vox-text-dim">{data.total} voice{data.total !== 1 ? "s" : ""} in your library</p>
          <p className="text-xs text-vox-text-dim hidden sm:block">One Voice = One Product &middot; Each voice gets its own API key</p>
        </div>
      )}

      {!data || data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-vox-surface flex items-center justify-center mb-4"><Mic size={32} className="text-vox-text-dim opacity-50" /></div>
          <h3 className="text-lg font-medium text-vox-heading mb-2">No Voices Yet</h3>
          <p className="text-sm text-vox-text-dim max-w-md">Upload your first voice reference to start building your voice library. Each voice becomes an API product with its own key.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.items.map((item) => {
            const keyInfo = apiKeysMap[item.id];
            const status = getVoiceStatus(item, keyInfo);
            return (
              <div key={item.id} className="bg-vox-surface border border-vox-outline/15 rounded-2xl overflow-hidden hover:border-vox-primary/30 transition-all group flex flex-col">
                <div className="p-5 border-b border-vox-outline/10 flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <button onClick={() => togglePlay(item)}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${playingId === item.id ? "bg-vox-primary/20 ring-2 ring-vox-primary/40" : "bg-gradient-to-br from-vox-primary/15 to-vox-secondary/15 hover:from-vox-primary/25 hover:to-vox-secondary/25"}`}
                      title={playingId === item.id ? "Pause" : "Play preview"}>
                      {playingId === item.id ? <Pause size={18} className="text-vox-primary" /> : <Play size={18} className="text-vox-primary ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      {editingId === item.id ? (
                        <input className="w-full bg-vox-surface-lowest border border-vox-outline/30 rounded-lg px-2 py-1 text-sm text-vox-text outline-none focus:border-vox-primary" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                      ) : (
                        <h4 className="text-sm font-semibold text-vox-heading truncate">{item.name}</h4>
                      )}
                      <p className="text-xs text-vox-text-dim mt-0.5 truncate">{item.fileName} &middot; {formatSize(item.fileSize)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase border shrink-0 ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>

                  {editingId === item.id && (
                    <textarea className="w-full mt-1 bg-vox-surface-lowest border border-vox-outline/30 rounded-lg px-2 py-1 text-xs text-vox-text outline-none focus:border-vox-primary resize-none"
                      placeholder="Description (optional)" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} />
                  )}
                  {item.description && editingId !== item.id && <p className="text-xs text-vox-text-dim mt-1 line-clamp-2">{item.description}</p>}

                  {keyInfo && keyInfo.isActive ? (
                    <div className="mt-3 bg-vox-surface-low/60 border border-vox-outline/10 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-vox-text-dim uppercase tracking-wider">API Key</span>
                        <button onClick={() => copyMaskedKey(keyInfo)} className="text-vox-text-dim hover:text-vox-primary transition-colors" title="Copy masked key">
                          {copiedId === item.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <p className="font-mono text-xs text-vox-heading">vc_sk_live_&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;{keyInfo.lastFour}</p>
                      <div className="flex items-center gap-4 text-[10px] text-vox-text-dim">
                        <span>{keyInfo.usageCount} request{keyInfo.usageCount !== 1 ? "s" : ""}</span>
                        <span>Last used: {formatRelativeDate(keyInfo.lastUsedAt)}</span>
                      </div>
                    </div>
                  ) : editingId !== item.id ? (
                    <div className="mt-3">
                      <button onClick={() => handleGenerateApiKey(item.id, item.name)} disabled={generatingKeyForId === item.id}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-vox-outline/25 text-sm text-vox-text-dim hover:text-vox-primary hover:border-vox-primary/40 hover:bg-vox-primary/5 transition-all disabled:opacity-50">
                        {generatingKeyForId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                        Create API Key
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="px-4 py-3 flex items-center justify-between bg-vox-surface-low/30">
                  <span className="text-[10px] text-vox-text-dim">{formatDate(item.createdAt)}</span>
                  <div className="flex items-center gap-1">
                    {editingId === item.id ? (
                      <>
                        <button onClick={() => saveEdit(item.id)} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Save"><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Cancel"><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        {keyInfo && keyInfo.isActive && (
                          <button onClick={() => router.push("/studio/playground")} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-vox-secondary hover:bg-vox-secondary/10 transition-colors" title="Open Playground">
                            <TerminalSquare size={12} /><span className="hidden sm:inline">Playground</span>
                          </button>
                        )}
                        <button onClick={() => handleUseVoice(item)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-vox-primary hover:bg-vox-primary/10 transition-colors" title="Use this voice in Studio">
                          <Mic size={12} /><span className="hidden sm:inline">Use Voice</span>
                        </button>
                        {item.featureUrl && <span className="text-amber-400 p-1" title="Feature cached"><Zap size={12} /></span>}
                        <a href={item.audioUrl} download className="p-1.5 rounded-lg text-vox-text-dim hover:text-vox-secondary hover:bg-vox-surface transition-colors" title="Download audio"><Download size={14} /></a>
                        <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg text-vox-text-dim hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Edit"><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="p-1.5 rounded-lg text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50" title="Delete">
                          {deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm text-vox-text-dim hover:text-vox-heading bg-vox-surface rounded-lg border border-vox-outline/20 transition-colors disabled:opacity-30">
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-vox-text-dim px-3">Page <span className="text-vox-heading font-medium">{data.page}</span> of <span className="text-vox-heading font-medium">{data.totalPages}</span></span>
          <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm text-vox-text-dim hover:text-vox-heading bg-vox-surface rounded-lg border border-vox-outline/20 transition-colors disabled:opacity-30">
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
