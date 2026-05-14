"use client";

import { useState, useEffect, useRef } from "react";
import {
    Play, Loader2, Copy, Check, AlertTriangle, Volume2,
    TerminalSquare, ChevronDown,
} from "lucide-react";
import { useI18n } from "@/i18n";

interface VoiceWithKey {
    voiceId: string;
    voiceName: string;
    apiKeyId: string;
    prefix: string;
    lastFour: string;
    isActive: boolean;
}

export default function PlaygroundPanel() {
    const { t } = useI18n();
    const [voices, setVoices] = useState<VoiceWithKey[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<VoiceWithKey | null>(null);
    const [text, setText] = useState("Hello, this is a test of my cloned voice.");
    const [mode, setMode] = useState<"blocking" | "streaming">("blocking");
    const [loading, setLoading] = useState(false);
    const [loadingVoices, setLoadingVoices] = useState(true);
    const [result, setResult] = useState<{ status: number; body: Record<string, unknown> } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        fetchVoicesWithKeys();
    }, []);

    const fetchVoicesWithKeys = async () => {
        try {
            const res = await fetch("/api/keys");
            const json = await res.json();
            if (json.ok && json.data?.keys) {
                const items: VoiceWithKey[] = json.data.keys
                    .filter((k: Record<string, unknown>) => k.isActive)
                    .map((k: Record<string, unknown>) => ({
                        voiceId: k.voiceProfileId,
                        voiceName: (k.voiceProfile as Record<string, unknown>)?.name || "Unknown Voice",
                        apiKeyId: k.id,
                        prefix: k.prefix,
                        lastFour: k.lastFour,
                        isActive: k.isActive,
                    }));
                setVoices(items);
                if (items.length > 0) setSelectedVoice(items[0]);
            }
        } catch (err) {
            console.error("Failed to fetch voices", err);
        } finally {
            setLoadingVoices(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedVoice || !text.trim()) return;
        setLoading(true);
        setResult(null);
        setError(null);
        setAudioUrl(null);

        try {
            const res = await fetch("/api/tts/playground", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text.trim(),
                    mode,
                    voiceProfileId: selectedVoice.voiceId,
                }),
            });

            const status = res.status;
            const body = await res.json();
            setResult({ status, body });

            if (body.ok && body.data?.audio_url) {
                setAudioUrl(body.data.audio_url);
            } else if (!body.ok) {
                setError(body.error?.message || "Request failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Network error");
        } finally {
            setLoading(false);
        }
    };

    const copyResult = () => {
        if (!result) return;
        navigator.clipboard.writeText(JSON.stringify(result.body, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const statusColor = (code: number) => {
        if (code >= 200 && code < 300) return "text-emerald-400";
        if (code >= 400 && code < 500) return "text-amber-400";
        return "text-red-400";
    };

    return (
        <div className="flex flex-col gap-6 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-vox-heading tracking-tight flex items-center gap-2">
                    <TerminalSquare size={24} className="text-vox-secondary" /> {t.playground.title}
                </h1>
                <p className="text-sm text-vox-text-dim mt-1">
                    {t.playground.subtitle}
                </p>
            </div>

            {/* Important note */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-vox-text-dim">
                    {t.playground.warning}
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Left — Input */}
                <div className="bg-vox-surface border border-vox-outline/20 rounded-2xl overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-vox-outline/10">
                        <h2 className="text-base font-semibold text-vox-heading">{t.playground.request}</h2>
                    </div>
                    <div className="p-6 space-y-5 flex-1">
                        {/* Voice Selector */}
                        <div>
                            <label className="block text-xs font-bold text-vox-text-dim uppercase tracking-wider mb-2">{t.playground.voice}</label>
                            {loadingVoices ? (
                                <div className="flex items-center gap-2 text-sm text-vox-text-dim"><Loader2 size={14} className="animate-spin" /> Loading voices&hellip;</div>
                            ) : voices.length === 0 ? (
                                <p className="text-sm text-vox-text-dim">No voices with active API keys. <a href="/studio/voices" className="text-vox-primary hover:underline">Create one</a>.</p>
                            ) : (
                                <div className="relative">
                                    <button onClick={() => setDropdownOpen(!dropdownOpen)}
                                        className="w-full flex items-center justify-between bg-vox-surface-low border border-vox-outline/20 rounded-xl px-4 py-3 text-sm text-vox-heading hover:border-vox-primary/30 transition-colors">
                                        <span>{selectedVoice?.voiceName || t.playground.selectVoice}</span>
                                        <ChevronDown size={16} className={`text-vox-text-dim transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {dropdownOpen && (
                                        <div className="absolute z-10 mt-1 w-full bg-vox-surface border border-vox-outline/20 rounded-xl shadow-lg overflow-hidden">
                                            {voices.map((v) => (
                                                <button key={v.apiKeyId} onClick={() => { setSelectedVoice(v); setDropdownOpen(false); }}
                                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-vox-primary/10 transition-colors ${selectedVoice?.apiKeyId === v.apiKeyId ? "bg-vox-primary/5 text-vox-primary" : "text-vox-heading"}`}>
                                                    <span className="font-medium">{v.voiceName}</span>
                                                    <span className="text-xs text-vox-text-dim ml-2 font-mono">vc_sk_live_&bull;&bull;&bull;&bull;{v.lastFour}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Text Input */}
                        <div>
                            <label className="block text-xs font-bold text-vox-text-dim uppercase tracking-wider mb-2">{t.playground.text}</label>
                            <textarea value={text} onChange={(e) => setText(e.target.value)}
                                placeholder="Enter text to synthesize..."
                                rows={5}
                                className="w-full bg-vox-surface-low border border-vox-outline/20 rounded-xl px-4 py-3 text-sm text-vox-heading placeholder-vox-text-dim outline-none focus:border-vox-primary resize-none leading-relaxed" />
                            <p className="text-xs text-vox-text-dim mt-1 text-right">{text.length} characters</p>
                        </div>

                        {/* Mode */}
                        <div>
                            <label className="block text-xs font-bold text-vox-text-dim uppercase tracking-wider mb-2">{t.playground.mode}</label>
                            <div className="flex gap-2">
                                <button onClick={() => setMode("blocking")}
                                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${mode === "blocking" ? "bg-vox-primary/10 border-vox-primary/30 text-vox-primary" : "bg-vox-surface-low border-vox-outline/20 text-vox-text-dim hover:text-vox-heading"}`}>
                                    {t.playground.blocking}
                                </button>
                                <button onClick={() => setMode("streaming")}
                                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${mode === "streaming" ? "bg-vox-primary/10 border-vox-primary/30 text-vox-primary" : "bg-vox-surface-low border-vox-outline/20 text-vox-text-dim hover:text-vox-heading"}`}>
                                    {t.playground.streaming}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="px-6 py-4 border-t border-vox-outline/10">
                        <button onClick={handleGenerate} disabled={loading || !selectedVoice || !text.trim()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-vox-primary text-white font-semibold rounded-xl hover:bg-vox-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                            {loading ? <><Loader2 size={16} className="animate-spin" /> {t.common.loading}</> : <><Play size={16} /> {t.playground.generateSpeech}</>}
                        </button>
                    </div>
                </div>

                {/* Right — Response */}
                <div className="bg-vox-surface border border-vox-outline/20 rounded-2xl overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-vox-outline/10 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-vox-heading">{t.playground.response}</h2>
                        {result && (
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold font-mono ${statusColor(result.status)}`}>{result.status}</span>
                                <button onClick={copyResult} className="text-vox-text-dim hover:text-vox-primary transition-colors" title="Copy response">
                                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col gap-4">
                        {loading && (
                            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
                                <Loader2 size={24} className="animate-spin text-vox-primary" />
                                <p className="text-sm text-vox-text-dim">Calling API&hellip;</p>
                            </div>
                        )}

                        {!loading && !result && !error && (
                            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                                <TerminalSquare size={32} className="text-vox-text-dim opacity-30 mb-3" />
                                <p className="text-sm text-vox-text-dim">{t.playground.responsePlaceholder}</p>
                            </div>
                        )}

                        {error && !result && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-300">{error}</p>
                            </div>
                        )}

                        {/* Audio Player */}
                        {audioUrl && (
                            <div className="bg-vox-surface-low border border-vox-outline/10 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-vox-heading">
                                    <Volume2 size={16} className="text-vox-secondary" /> Audio Output
                                </div>
                                <audio ref={audioRef} controls src={audioUrl} className="w-full h-10" />
                                <a href={audioUrl} download className="inline-flex items-center gap-1.5 text-xs text-vox-primary hover:underline">
                                    Download audio file
                                </a>
                            </div>
                        )}

                        {/* JSON Response */}
                        {result && (
                            <div className="relative rounded-xl overflow-hidden border border-vox-outline/20 bg-[#1a1b26] flex-1">
                                <div className="flex items-center justify-between px-4 py-2 bg-[#13141c] border-b border-vox-outline/10 text-xs text-gray-400 font-mono">
                                    <span>json</span>
                                    <span className={statusColor(result.status)}>HTTP {result.status}</span>
                                </div>
                                <pre className="p-4 overflow-auto text-sm font-mono text-gray-300 leading-relaxed whitespace-pre max-h-80">
                                    {JSON.stringify(result.body, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
