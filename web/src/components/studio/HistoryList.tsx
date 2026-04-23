"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Play, Pause, Download, Trash2, Clock, SlidersHorizontal,
  Loader2, AlertTriangle, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HistoryItem {
  id: string;
  text: string;
  controlInstruction: string;
  audioUrl: string;
  language: string;
  cfgValue: number;
  ditSteps: number;
  doNormalize: boolean;
  denoise: boolean;
  usePromptText: boolean;
  promptText: string;
  createdAt: string;
}

interface PaginatedResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HistoryList() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const limit = 15;

  // ---- Fetch history ----
  const fetchHistory = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/history?page=${p}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(page);
  }, [page, fetchHistory]);

  // ---- Audio playback ----
  const togglePlay = (item: HistoryItem) => {
    if (playingId === item.id) {
      audioEl?.pause();
      setPlayingId(null);
      return;
    }

    if (audioEl) {
      audioEl.pause();
    }

    const audio = new Audio(item.audioUrl);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play();
    setAudioEl(audio);
    setPlayingId(item.id);
  };

  // ---- Delete single ----
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this generation?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchHistory(page);
    } catch {
      alert("Failed to delete. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // ---- Clear all ----
  const handleClearAll = async () => {
    if (!confirm("Delete ALL your generation history? This cannot be undone.")) return;
    setClearingAll(true);
    try {
      const res = await fetch("/api/history", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear");
      setPage(1);
      await fetchHistory(1);
    } catch {
      alert("Failed to clear history. Please try again.");
    } finally {
      setClearingAll(false);
    }
  };

  // ---- Format date ----
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  // ========================== RENDER ==========================

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={32} className="animate-spin text-vox-primary" />
        <p className="text-sm text-vox-text-dim">Loading history…</p>
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

  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-vox-surface flex items-center justify-center mb-4">
          <Clock size={32} className="text-vox-text-dim opacity-50" />
        </div>
        <h3 className="text-lg font-medium text-vox-heading mb-2">No History Yet</h3>
        <p className="text-sm text-vox-text-dim max-w-md">
          Your TTS generations will appear here after you synthesize speech in the Studio.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-vox-text-dim">
            {data.total} generation{data.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={handleClearAll}
          disabled={clearingAll}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
        >
          {clearingAll ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <X size={14} />
          )}
          Clear All History
        </button>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-3">
        {data.items.map((item) => (
          <GlassCard
            key={item.id}
            className="!p-4 hover:border-vox-primary/30 transition-all group"
          >
            <div className="flex items-start gap-4">
              {/* Play button */}
              <button
                onClick={() => togglePlay(item)}
                className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  playingId === item.id
                    ? "bg-vox-primary text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                    : "bg-vox-surface-high hover:bg-vox-primary hover:text-white text-vox-text-dim"
                }`}
              >
                {playingId === item.id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-vox-text line-clamp-2 leading-relaxed">{item.text}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                  {item.controlInstruction && (
                    <span className="text-xs text-vox-text-dim flex items-center gap-1 max-w-[250px] truncate">
                      <SlidersHorizontal size={10} className="text-vox-secondary shrink-0" />
                      {item.controlInstruction}
                    </span>
                  )}
                  <span className="text-xs text-vox-text-dim flex items-center gap-1">
                    <Clock size={10} className="shrink-0" />
                    {formatDate(item.createdAt)}
                  </span>
                  {item.usePromptText && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      🎙️ Cloning
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-vox-surface border border-vox-outline/20 text-vox-text-dim uppercase">
                    {item.language}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={item.audioUrl}
                  download
                  className="p-2 rounded-lg text-vox-text-dim hover:text-vox-secondary hover:bg-vox-surface transition-colors"
                  title="Download"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="p-2 rounded-lg text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === item.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
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
