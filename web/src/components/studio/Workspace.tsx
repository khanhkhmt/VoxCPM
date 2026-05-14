"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { generateSpeech } from "@/lib/tts";
import { useAuth } from "@/lib/auth";
import { GlassCard } from "@/components/GlassCard";
import { StreamingTTSPanel } from "@/components/studio/StreamingTTSPanel";
import { useVoiceSelection } from "@/lib/stores/voice-selection";
import { useI18n } from "@/i18n";
import {
    SlidersHorizontal, Type, Play, Mic, Waves, Download,
    CheckCircle2, RotateCcw, History as HistoryIcon,
    Upload, X, FileAudio, ChevronDown, ChevronUp,
    Lightbulb, AlertTriangle, Loader2, Trash2, Zap,
} from "lucide-react";

interface LibraryVoice {
    id: string;
    name: string;
    audioUrl: string;
    featureUrl: string | null;
    voxcpmVersion: string | null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HistoryItem {
    id: string;
    text: string;
    audioUrl: string;
    date: string;
    controlInstruction: string;
}

// ---------------------------------------------------------------------------
// Examples data
// ---------------------------------------------------------------------------
const EXAMPLES = [
    {
        title: "Gentle & Melancholic Girl",
        control: "A young girl with a soft, sweet voice. Speaks slowly with a melancholic, slightly tsundere tone.",
        text: "I never asked you to stay… It's not like I care or anything. But… why does it still hurt so much now that you're gone?",
    },
    {
        title: "Laid-Back Surfer Dude",
        control: "Relaxed young male voice, slightly nasal, lazy drawl, very casual and chill.",
        text: "Dude, did you see that set? The waves out there are totally gnarly today. Just catching barrels all morning.",
    },
    {
        title: "暴躁驾校教练",
        control: "暴躁的中年男声，语速快，充满无奈和愤怒",
        text: "踩离合！踩刹车啊！你往哪儿开呢？前面是树你看不见吗？我教了你八百遍了，打死方向盘！",
    },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Workspace() {
    const { user } = useAuth();
    const { t } = useI18n();
    const selectedLibraryVoice = useVoiceSelection((s) => s.selected);
    const setSelectedVoice = useVoiceSelection((s) => s.setSelected);
    const clearLibraryVoice = useCallback(() => setSelectedVoice(null), [setSelectedVoice]);

    // localStorage key riêng cho từng tài khoản
    const historyKey = user ? `voxora_history_${user.id}` : null;

    // ---- TTS State (REAL) ----
    const [text, setText] = useState("");
    const [controlInstruction, setControlInstruction] = useState("");
    const [cfgValue, setCfgValue] = useState(2.0);
    const [ditSteps, setDitSteps] = useState(6);
    const [doNormalize, setDoNormalize] = useState(false);
    const [denoise, setDenoise] = useState(false);

    const [refAudioFile, setRefAudioFile] = useState<File | null>(null);
    const [refAudioPreview, setRefAudioPreview] = useState<string | null>(null);
    const [activeVoiceProfileId, setActiveVoiceProfileId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSavingVoice, setIsSavingVoice] = useState(false);

    // ---- Ultimate Cloning (REAL) ----
    const [ultimateCloning, setUltimateCloning] = useState(false);
    const [promptText, setPromptText] = useState("");

    // ---- Language Selection (REAL) ----
    const [language, setLanguage] = useState("auto");

    // ---- App State ----
    const [isStreamingMode, setIsStreamingMode] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [currentAudio, setCurrentAudio] = useState<string | null>(null);
    const [streamingFinalUrl, setStreamingFinalUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [showExamples, setShowExamples] = useState(false);

    // ---- Voice Library State ----
    const [libraryVoices, setLibraryVoices] = useState<LibraryVoice[]>([]);
    // Fetch voice library on mount
    useEffect(() => {
        fetch("/api/voices?limit=50")
            .then((r) => r.json())
            .then((j) => {
                if (j.data?.items) setLibraryVoices(j.data.items);
            })
            .catch(() => {});
    }, []);

    // ---- Fetch history from DB ----
    const fetchRecentHistory = useCallback(async () => {
        try {
            const res = await fetch("/api/history?limit=10");
            if (res.ok) {
                const json = await res.json();
                if (json.data?.items) {
                    const mapped = json.data.items.map((item: any) => ({
                        id: item.id,
                        text: item.text,
                        audioUrl: item.audioUrl,
                        date: new Date(item.createdAt).toLocaleTimeString(),
                        controlInstruction: item.controlInstruction || "",
                    }));
                    setHistory(mapped);
                }
            }
        } catch (e) {
            console.error("[Workspace] Failed to fetch recent history:", e);
        }
    }, []);

    // Load history khi user thay đổi hoặc focus lại tab
    useEffect(() => {
        fetchRecentHistory();
        
        const onFocus = () => fetchRecentHistory();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [fetchRecentHistory, user]);

    // ---- Reference audio helpers ----
    const handleFileSelect = useCallback((file: File) => {
        setRefAudioFile(file);
        setRefAudioPreview(URL.createObjectURL(file));
        clearLibraryVoice();

    }, [clearLibraryVoice]);

    const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("audio/")) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    const clearRefAudio = useCallback(() => {
        setRefAudioFile(null);
        if (refAudioPreview) URL.revokeObjectURL(refAudioPreview);
        setRefAudioPreview(null);
        setActiveVoiceProfileId(null);
        if (ultimateCloning) {
            setUltimateCloning(false);
            setPromptText("");
        }
    }, [refAudioPreview, ultimateCloning]);

    // ---- Save Reference Audio to Library ----
    const handleSaveReferenceToLibrary = async () => {
        if (!refAudioFile) return;
        const name = prompt("Enter a name for this voice:", refAudioFile.name.replace(/\.[^.]+$/, ""));
        if (!name) return;

        setIsSavingVoice(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("file", refAudioFile);
            formData.append("name", name);
            formData.append("description", "Uploaded from Studio");

            const res = await fetch("/api/voices", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error?.message || "Failed to save voice");
            }

            const newVoice = await res.json();
            
            // Refresh library voices
            const voicesRes = await fetch("/api/voices?limit=50");
            if (voicesRes.ok) {
                const voicesJson = await voicesRes.json();
                if (voicesJson.data?.items) {
                    setLibraryVoices(voicesJson.data.items);
                }
            }

            // Select the newly created voice
            if (newVoice.data) {
                const v = newVoice.data;
                setSelectedVoice({
                    id: v.id,
                    name: v.name,
                    audioUrl: v.audioUrl,
                    featureUrl: v.featureUrl ?? null,
                    voxcpmVersion: v.voxcpmVersion ?? null,
                });
                setRefAudioFile(null);
                setRefAudioPreview(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save voice");
        } finally {
            setIsSavingVoice(false);
        }
    };

    // ---- Generate ----
    const handleGenerate = async () => {
        if (!text.trim()) {
            setError("Please enter some text to synthesize.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setCurrentAudio(null);

        try {
            // Resolve the audio reference. Prefer the cached feature when
            // available; otherwise fall back to the library voice's WAV
            // (fetched from R2) so cloning still works even if the
            // feature-encode step failed during voice upload.
            let voiceFeatureUrl: string | null = null;
            let referenceWav: File | null = refAudioFile;

            if (selectedLibraryVoice) {
                if (selectedLibraryVoice.featureUrl) {
                    voiceFeatureUrl = selectedLibraryVoice.featureUrl;
                    referenceWav = null;
                } else if (selectedLibraryVoice.audioUrl) {
                    try {
                        // Use the server-side proxy to avoid CORS issues with R2
                        const proxyUrl = `/api/voices/${selectedLibraryVoice.id}/audio`;
                        const audioRes = await fetch(proxyUrl);
                        if (!audioRes.ok) {
                            throw new Error(`HTTP ${audioRes.status}`);
                        }
                        const blob = await audioRes.blob();
                        const fileName = `${selectedLibraryVoice.name || "library-voice"}.wav`;
                        referenceWav = new File([blob], fileName, {
                            type: blob.type || "audio/wav",
                        });
                    } catch (fetchErr) {
                        console.error(
                            "[Workspace] Failed to fetch library voice audio:",
                            fetchErr,
                        );
                        setError(
                            "Selected library voice is missing both a cached feature and a downloadable audio reference.",
                        );
                        setIsGenerating(false);
                        return;
                    }
                }
            }

            const result = await generateSpeech({
                text,
                controlInstruction: ultimateCloning ? "" : controlInstruction,
                voiceFeatureUrl,
                referenceWav,
                usePromptText: ultimateCloning,
                promptText: ultimateCloning ? promptText : "",
                cfgValue,
                doNormalize,
                denoise,
                ditSteps,
                language,
            });

            if (result.error) {
                setError(result.error);
            } else if (result.audioUrl) {
                setCurrentAudio(result.audioUrl);
                const newItem: HistoryItem = {
                    id: Date.now().toString(),
                    text: text.substring(0, 120),
                    audioUrl: result.audioUrl,
                    date: new Date().toLocaleTimeString(),
                    controlInstruction: controlInstruction.substring(0, 60),
                };
                const newHistory = [newItem, ...history].slice(0, 10);
                setHistory(newHistory);

                // --- 🆕 Persist to database (fire-and-forget, không block UI) ---
                const tempId = newItem.id;
                fetch("/api/history", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text, controlInstruction: ultimateCloning ? "" : controlInstruction,
                        audioUrl: result.audioUrl, language, cfgValue, ditSteps,
                        doNormalize, denoise, usePromptText: ultimateCloning, promptText,
                        voiceProfileId: activeVoiceProfileId,
                    }),
                }).then(async (res) => {
                    const json = await res.json();
                    console.log("[History Save]", res.status, json);
                    // Cập nhật ID + audioUrl từ R2 vào localStorage
                    if (res.ok && json.data?.id) {
                        const dbId = json.data.id;
                        const r2Url = json.data.audioUrl;
                        setHistory(prev => {
                            const updated = prev.map(h =>
                                h.id === tempId ? { ...h, id: dbId, audioUrl: r2Url || h.audioUrl } : h
                            );
                            return updated;
                        });
                        // Chuyển player sang R2 URL (không dùng local nữa)
                        if (r2Url) setCurrentAudio(r2Url);
                    }
                }).catch((err) => {
                    console.error("[History Save Error]", err);
                });
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStreamingDone = useCallback((audioUrl: string) => {
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            text: text.substring(0, 120),
            audioUrl: audioUrl,
            date: new Date().toLocaleTimeString(),
            controlInstruction: controlInstruction.substring(0, 60),
        };
        const newHistory = [newItem, ...history].slice(0, 10);
        setHistory(newHistory);

        const tempId = newItem.id;
        fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text, controlInstruction: ultimateCloning ? "" : controlInstruction,
                audioUrl: audioUrl, language, cfgValue, ditSteps,
                doNormalize, denoise, usePromptText: ultimateCloning, promptText,
                voiceProfileId: activeVoiceProfileId,
            }),
        }).then(async (res) => {
            const json = await res.json();
            if (res.ok && json.data?.id) {
                const dbId = json.data.id;
                const r2Url = json.data.audioUrl;
                setHistory(prev => {
                    const updated = prev.map(h =>
                        h.id === tempId ? { ...h, id: dbId, audioUrl: r2Url || h.audioUrl } : h
                    );
                    return updated;
                });
                // Chuyển player sang R2 URL (tránh bị 404 do file local bị xoá)
                if (r2Url) setStreamingFinalUrl(r2Url);
            }
        }).catch((err) => {
            console.error("[Streaming History Save Error]", err);
        });
    }, [text, controlInstruction, ultimateCloning, promptText, language, cfgValue, ditSteps, doNormalize, denoise, activeVoiceProfileId, history, historyKey]);

    const handleClear = () => {
        setText("");
        setControlInstruction("");
        setPromptText("");
        setError(null);
        setCurrentAudio(null);
    };

    const applyExample = (ex: typeof EXAMPLES[0]) => {
        setControlInstruction(ex.control);
        setText(ex.text);
        setShowExamples(false);
    };

    // ========================== RENDER ==========================
    return (
        <div className="flex flex-col gap-6">
            <div className="grid lg:grid-cols-12 gap-6 items-start">

                {/* ========== LEFT PANEL ========== */}
                <div className="lg:col-span-7 flex flex-col gap-4">

                    {/* --- Reference Audio Upload --- */}
                    <GlassCard className="!p-4">
                        <label className="text-sm font-medium text-vox-text flex items-center gap-2 mb-3">
                            <FileAudio size={14} className="text-vox-secondary" />
                            {t.studio.referenceAudio.title}
                            <span className="text-xs text-vox-text-dim ml-1">({t.studio.referenceAudio.optional})</span>
                        </label>

                        {/* Voice Library Selector */}
                        {libraryVoices.length > 0 && (
                            <div className="mb-3">
                                <label className="text-xs text-vox-text-dim mb-1 block">{t.studio.referenceAudio.pickFromLibrary}</label>
                                <select
                                    value={selectedLibraryVoice?.id ?? ""}
                                    onChange={(e) => {
                                        const v = libraryVoices.find((x) => x.id === e.target.value);
                                        if (v) {
                                            setSelectedVoice({
                                                id: v.id,
                                                name: v.name,
                                                audioUrl: v.audioUrl,
                                                featureUrl: v.featureUrl ?? null,
                                                voxcpmVersion: v.voxcpmVersion ?? null,
                                            });
                                            setRefAudioFile(null);
                                            setRefAudioPreview(null);
                                        } else {
                                            clearLibraryVoice();
                                        }
                                    }}
                                    className="w-full bg-vox-surface-lowest border border-vox-outline/30 rounded-xl px-3 py-2 text-sm text-vox-text outline-none focus:border-vox-primary transition-colors"
                                >
                                    <option value="">— {t.common.none} —</option>
                                    {libraryVoices.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.name} {v.featureUrl ? "\u26A1" : ""}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-vox-text-dim mt-1">
                                    <Zap size={10} className="inline text-amber-400" /> = {t.studio.referenceAudio.hasFeatureCache}
                                </p>
                            </div>
                        )}

                        {/* Selected Library Voice Display */}
                        {selectedLibraryVoice ? (
                            <div className="flex items-center gap-3 bg-vox-surface-lowest border border-vox-primary/30 rounded-xl p-3">
                                <div className="w-10 h-10 rounded-lg bg-vox-primary/10 flex items-center justify-center shrink-0">
                                    <Mic size={20} className="text-vox-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-vox-text font-medium truncate">
                                        {t.studio.referenceAudio.using} {selectedLibraryVoice.name}
                                    </p>
                                    {selectedLibraryVoice.featureUrl && (
                                        <p className="text-xs text-amber-400 flex items-center gap-1">
                                            <Zap size={10} /> {t.studio.referenceAudio.featureCached}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={clearLibraryVoice}
                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-vox-text-dim hover:text-red-400 transition-colors"
                                    title={t.studio.referenceAudio.clearSelection}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : refAudioFile ? (
                            <div className="flex items-center gap-3 bg-vox-surface-lowest border border-vox-outline/20 rounded-xl p-3">
                                <div className="w-10 h-10 rounded-lg bg-vox-primary/10 flex items-center justify-center shrink-0">
                                    <FileAudio size={20} className="text-vox-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-vox-text truncate">{refAudioFile.name}</p>
                                    <p className="text-xs text-vox-text-dim">{(refAudioFile.size / 1024).toFixed(0)} KB</p>
                                </div>
                                {refAudioPreview && (
                                    <audio controls src={refAudioPreview} className="h-8 w-40 shrink-0" />
                                )}
                                <button
                                    onClick={handleSaveReferenceToLibrary}
                                    disabled={isSavingVoice}
                                    className="p-1.5 px-3 rounded-lg bg-vox-secondary/20 hover:bg-vox-secondary/30 text-xs flex items-center gap-1 text-vox-secondary transition-colors disabled:opacity-50"
                                    title={t.studio.referenceAudio.saveToLibrary}
                                >
                                    {isSavingVoice ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                    <span className="hidden sm:inline">{t.common.save}</span>
                                </button>
                                <button
                                    onClick={clearRefAudio}
                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-vox-text-dim hover:text-red-400 transition-colors"
                                    title="Remove"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleFileDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-vox-outline/30 hover:border-vox-primary/50 rounded-xl p-6 text-center cursor-pointer transition-colors group"
                            >
                                <Upload size={24} className="mx-auto mb-2 text-vox-text-dim group-hover:text-vox-primary transition-colors" />
                                <p className="text-sm text-vox-text-dim group-hover:text-vox-text transition-colors">
                                    {t.studio.referenceAudio.dropAudio}
                                </p>
                                <p className="text-xs text-vox-text-dim mt-1">{t.studio.referenceAudio.audioFormats}</p>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileSelect(f);
                                e.target.value = "";
                            }}
                        />

                        {/* --- Ultimate Cloning Toggle --- */}
                        {(refAudioFile || selectedLibraryVoice) && (
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center justify-between p-3 bg-vox-surface rounded-xl border border-vox-outline/10">
                                    <div>
                                        <div className="text-sm font-medium flex items-center gap-2">
                                            🎙️ {t.studio.ultimateCloning.title}
                                        </div>
                                        <div className="text-xs text-vox-text-dim mt-0.5 max-w-xs">
                                            {t.studio.ultimateCloning.desc}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setUltimateCloning(!ultimateCloning)}
                                        className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${ultimateCloning ? "bg-vox-primary" : "bg-vox-outline"}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${ultimateCloning ? "left-6" : "left-1"}`} />
                                    </button>
                                </div>

                                {/* Transcript textarea */}
                                {ultimateCloning && (
                                    <div className="bg-vox-surface-lowest border border-vox-outline/20 rounded-xl p-4 space-y-2">
                                        <label className="text-sm font-medium text-vox-text flex items-center gap-2">
                                            {t.studio.ultimateCloning.transcriptTitle}
                                            <span className="text-[10px] text-vox-text-dim bg-vox-surface px-2 py-0.5 rounded-full">{t.studio.ultimateCloning.editable}</span>
                                        </label>
                                        <textarea
                                            className="w-full bg-transparent border border-vox-outline/20 rounded-lg px-4 py-2.5 text-sm text-vox-text outline-none focus:border-vox-secondary transition-colors resize-none min-h-[80px]"
                                            placeholder={t.studio.ultimateCloning.transcriptPlaceholder}
                                            value={promptText}
                                            onChange={(e) => setPromptText(e.target.value)}
                                        />
                                        <p className="text-[11px] text-vox-text-dim">
                                            💡 {t.studio.ultimateCloning.transcriptHint}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </GlassCard>

                    {/* --- Control Instruction --- */}
                    <GlassCard className={`!p-4 transition-opacity duration-300 ${ultimateCloning ? "opacity-40 pointer-events-none" : ""}`}>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-vox-text flex items-center gap-2">
                                <SlidersHorizontal size={14} className="text-vox-primary" />
                                {t.studio.controlInstruction.title}
                                <span className="text-xs text-vox-secondary ml-2 bg-vox-secondary/10 px-2 rounded-full hidden sm:inline-block">{t.studio.controlInstruction.voiceDesign}</span>
                                {ultimateCloning && (
                                    <span className="text-xs text-amber-400 ml-auto">{t.studio.ultimateCloning.disabled}</span>
                                )}
                            </label>
                            <input
                                type="text"
                                className="w-full bg-vox-surface-lowest border border-vox-outline/30 rounded-xl px-4 py-2.5 text-sm text-vox-text outline-none focus:border-vox-primary transition-colors focus:ring-1 focus:ring-vox-primary shadow-inner"
                                placeholder='e.g. "A middle-aged man with a deep, rasping voice, speaking slowly and calmly."'
                                value={controlInstruction}
                                onChange={(e) => setControlInstruction(e.target.value)}
                                disabled={ultimateCloning}
                            />
                            <p className="text-xs text-vox-text-dim mt-1 ml-1">
                                {t.studio.controlInstruction.desc} <code className="text-vox-secondary">(instruction)text</code>.
                            </p>
                        </div>
                    </GlassCard>

                    {/* --- Target Text --- */}
                    <GlassCard className="flex-1 min-h-[300px] flex flex-col relative group !p-1">
                        <div className="px-5 py-3 border-b border-vox-outline/20 flex justify-between items-center bg-vox-surface/50 rounded-t-2xl">
                            <div className="flex items-center gap-2 text-vox-text">
                                <Type size={16} className="text-vox-secondary" />
                                <span className="font-medium text-sm font-semibold tracking-wide">{t.studio.targetText.title}</span>
                            </div>
                            <span className="text-xs text-vox-text-dim px-2 bg-vox-surface rounded-full border border-vox-outline/30">{text.length} / 4096</span>
                        </div>
                        <textarea
                            className="w-full flex-1 bg-transparent border-none outline-none resize-none p-5 text-vox-text placeholder-vox-text-dim/50 leading-relaxed"
                            placeholder={t.studio.targetText.placeholder}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                    </GlassCard>
                </div>

                {/* ========== RIGHT PANEL ========== */}
                <div className="lg:col-span-5 flex flex-col gap-4">

                    {/* --- Synthesis Settings Card --- */}
                    <GlassCard className="!p-0 border-t-2 border-t-vox-primary">
                        <div className="p-5 border-b border-vox-outline/20 bg-gradient-to-r from-vox-surface to-transparent">
                            <h3 className="font-medium flex items-center gap-2">
                                <Mic size={16} className="text-vox-secondary" /> {t.studio.synthesisSettings.title}
                            </h3>
                        </div>

                        <div className="p-5 flex flex-col gap-6">
                            {/* Language Selection */}
                            <div>
                                <label className="block text-xs font-medium text-vox-text-dim mb-1.5 ml-1 uppercase tracking-wider">🌐 {t.studio.synthesisSettings.normLanguage}</label>
                                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-vox-surface border border-vox-outline/30 rounded-lg px-3 py-2 text-sm text-vox-text outline-none focus:border-vox-primary">
                                    <option value="auto">{t.studio.synthesisSettings.autoDetect}</option>
                                    <option value="vi">Tiếng Việt</option>
                                    <option value="zh">中文 (Chinese)</option>
                                    <option value="en">English</option>
                                </select>
                                <p className="text-[10px] text-vox-text-dim mt-1 ml-1">
                                    {t.studio.synthesisSettings.normLanguageHint}
                                </p>
                            </div>

                            <div className="w-full h-px bg-vox-outline/20" />

                            {/* --- REAL Parameters --- */}
                            <div className="space-y-5">
                                {/* CFG */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium text-vox-text">{t.studio.synthesisSettings.guidanceScale} (CFG)</label>
                                        <span className="text-xs font-mono text-vox-secondary bg-vox-surface px-2 py-0.5 rounded">{cfgValue.toFixed(1)}</span>
                                    </div>
                                    <input type="range" min="1.0" max="3.0" step="0.1" value={cfgValue} onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) setCfgValue(v); }} className="w-full accent-vox-primary h-1.5 bg-vox-surface-high rounded-full appearance-none outline-none cursor-pointer" />
                                    <div className="flex justify-between text-[10px] text-vox-text-dim mt-1">
                                        <span>{t.studio.synthesisSettings.creative}</span><span>{t.studio.synthesisSettings.accurate}</span>
                                    </div>
                                </div>

                                {/* Inference Steps */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium text-vox-text">{t.studio.synthesisSettings.inferenceSteps}</label>
                                        <span className="text-xs font-mono text-vox-secondary bg-vox-surface px-2 py-0.5 rounded">{ditSteps}</span>
                                    </div>
                                    <input type="range" min="1" max="50" step="1" value={ditSteps} onChange={(e) => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) setDitSteps(v); }} className="w-full accent-vox-primary h-1.5 bg-vox-surface-high rounded-full appearance-none outline-none cursor-pointer" />
                                    <div className="flex justify-between text-[10px] text-vox-text-dim mt-1">
                                        <span>{t.studio.synthesisSettings.faster}</span><span>{t.studio.synthesisSettings.higherQuality}</span>
                                    </div>
                                </div>

                                {/* Denoise Toggle */}
                                <div className="flex items-center justify-between p-3 bg-vox-surface-low rounded-xl border border-vox-outline/10">
                                    <div>
                                        <div className="text-sm font-medium">{t.studio.synthesisSettings.refAudioDenoising}</div>
                                        <div className="text-xs text-vox-text-dim">{t.studio.synthesisSettings.refAudioDenoisingDesc}</div>
                                    </div>
                                    <button
                                        onClick={() => setDenoise(!denoise)}
                                        className={`w-11 h-6 rounded-full relative transition-colors ${denoise ? "bg-vox-primary" : "bg-vox-outline"}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${denoise ? "left-6" : "left-1"}`} />
                                    </button>
                                </div>

                                {/* Normalize Toggle */}
                                <div className="flex items-center justify-between p-3 bg-vox-surface-low rounded-xl border border-vox-outline/10">
                                    <div>
                                        <div className="text-sm font-medium">{t.studio.synthesisSettings.textNormalization}</div>
                                        <div className="text-xs text-vox-text-dim">{t.studio.synthesisSettings.textNormalizationDesc}</div>
                                    </div>
                                    <button
                                        onClick={() => setDoNormalize(!doNormalize)}
                                        className={`w-11 h-6 rounded-full relative transition-colors ${doNormalize ? "bg-vox-primary" : "bg-vox-outline"}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${doNormalize ? "left-6" : "left-1"}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* --- Examples / Hints (collapsible) --- */}
                    <GlassCard className="!p-0">
                        <button
                            onClick={() => setShowExamples(!showExamples)}
                            className="w-full p-4 flex items-center justify-between text-sm font-medium text-vox-text hover:bg-vox-surface-high/50 transition-colors rounded-2xl"
                        >
                            <span className="flex items-center gap-2">
                                <Lightbulb size={14} className="text-amber-400" /> {t.studio.examplePrompts}
                            </span>
                            {showExamples ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {showExamples && (
                            <div className="px-4 pb-4 space-y-3">
                                {EXAMPLES.map((ex, i) => (
                                    <button
                                        key={i}
                                        onClick={() => applyExample(ex)}
                                        className="w-full text-left p-3 bg-vox-surface border border-vox-outline/10 rounded-xl hover:border-vox-primary/40 transition-colors group"
                                    >
                                        <p className="text-sm font-medium text-vox-text group-hover:text-vox-heading transition-colors">{ex.title}</p>
                                        <p className="text-xs text-vox-text-dim mt-1 line-clamp-1"><span className="text-vox-secondary">Control:</span> {ex.control}</p>
                                        <p className="text-xs text-vox-text-dim mt-0.5 line-clamp-1"><span className="text-vox-secondary">Text:</span> {ex.text}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>

            {/* ========== ERROR ========== */}
            {error && (
                <div className="w-full bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl text-sm flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold text-red-400">{t.studio.generationFailed}</p>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* ========== MODE TOGGLE ========== */}
            <div className="flex items-center justify-center gap-2 mb-2 mt-4">
                <button
                    onClick={() => setIsStreamingMode(false)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!isStreamingMode ? "bg-vox-primary text-white shadow-lg" : "bg-vox-surface-high text-vox-text-dim hover:text-vox-text hover:bg-vox-surface-highest"}`}
                >
                    {t.studio.batchMode}
                </button>
                <button
                    onClick={() => setIsStreamingMode(true)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${isStreamingMode ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg" : "bg-vox-surface-high text-vox-text-dim hover:text-vox-text hover:bg-vox-surface-highest"}`}
                >
                    {t.studio.streamingMode} ⚡
                </button>
            </div>

            {!isStreamingMode ? (
                <>
                {/* ========== ACTION BAR ========== */}
                <div className="flex items-center justify-between bg-vox-surface/80 backdrop-blur-xl p-4 rounded-2xl border border-vox-outline/20 sticky bottom-6 shadow-2xl z-20">
                <button onClick={handleClear} className="px-4 py-2 text-sm text-vox-text-dim hover:text-vox-heading flex items-center gap-2 transition-colors" disabled={isGenerating}>
                    <RotateCcw size={16} /> {t.common.clear}
                </button>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className={`relative group overflow-hidden rounded-xl font-semibold px-10 py-3.5 transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] ${isGenerating ? "bg-vox-surface-high text-vox-text-dim cursor-wait" : "bg-vox-primary text-white hover:shadow-[0_0_30px_rgba(124,58,237,0.7)]"}`}
                >
                    <span className="relative z-10 flex items-center gap-2">
                        {isGenerating ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> {t.studio.synthesizing}
                            </>
                        ) : (
                            <>
                                <Waves size={18} /> {t.studio.generateSpeech}
                            </>
                        )}
                    </span>
                    {!isGenerating && <div className="absolute inset-0 bg-gradient-to-r from-vox-primary to-vox-secondary opacity-0 group-hover:opacity-100 transition-opacity z-0" />}
                </button>
            </div>

            {/* ========== OUTPUT AUDIO PANEL ========== */}
            <GlassCard className={`mt-2 relative overflow-hidden transition-all ${currentAudio ? "border-green-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]" :
                    isGenerating ? "border-vox-primary/30" :
                        "border-vox-outline/10"
                }`}>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Play className="text-vox-secondary" size={18} /> {t.studio.generatedAudio.title}
                </h3>

                {isGenerating ? (
                    /* Loading state */
                    <div className="flex flex-col items-center justify-center py-10 gap-4">
                        <div className="flex gap-1 items-end h-8">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="w-1 bg-vox-primary rounded-full animate-pulse" style={{ height: `${12 + Math.random() * 20}px`, animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                        <p className="text-sm text-vox-text-dim">{t.studio.generatedAudio.generatingMsg}</p>
                    </div>
                ) : currentAudio ? (
                    /* Success state */
                    <>
                        <div className="absolute top-4 right-4">
                            <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                                <CheckCircle2 size={12} /> {t.studio.generatedAudio.ready}
                            </div>
                        </div>
                        <div className="w-full bg-vox-surface-lowest rounded-xl p-4 flex items-center gap-4">
                            <audio ref={audioRef} controls src={currentAudio} className="w-full h-12" autoPlay />
                            <a href={currentAudio} download="voxora-synthesis.wav" className="p-3 bg-vox-surface rounded-lg hover:bg-vox-primary hover:text-white transition-colors text-vox-secondary shrink-0" title="Download">
                                <Download size={20} />
                            </a>
                        </div>
                    </>
                ) : (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center py-10 text-vox-text-dim">
                        <Waves size={32} className="mb-3 opacity-30" />
                        <p className="text-sm">{t.studio.generatedAudio.noAudio}</p>
                        <p className="text-xs mt-1">{t.studio.generatedAudio.noAudioHint}</p>
                    </div>
                )}
            </GlassCard>
            </>
            ) : (
                <StreamingTTSPanel
                    text={text}
                    controlInstruction={ultimateCloning ? "" : controlInstruction}
                    usePromptText={ultimateCloning}
                    promptText={ultimateCloning ? promptText : ""}
                    cfgValue={cfgValue}
                    doNormalize={doNormalize}
                    denoise={denoise}
                    ditSteps={ditSteps}
                    language={language}
                    referenceAudioFile={refAudioFile}
                    voiceFeatureUrl={selectedLibraryVoice?.featureUrl}
                    activeVoiceProfileId={activeVoiceProfileId}
                    finalAudioUrl={streamingFinalUrl}
                    onDone={handleStreamingDone}
                />
            )}

            {/* ========== HISTORY ========== */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-vox-text-dim uppercase tracking-wider flex items-center gap-2">
                        <HistoryIcon size={16} /> {t.studio.recentGenerations.title}
                    </h3>
                    {history.length > 0 && (
                        <button
                            onClick={() => {
                                // Xoá file audio trên server
                                for (const item of history) {
                                    const fileName = item.audioUrl.split("/").pop();
                                    if (fileName) {
                                        fetch(`/tts_api/file/${fileName}`, { method: "DELETE" }).catch(() => {});
                                    }
                                }
                                // 🆕 Xóa tất cả history trong database
                                fetch("/api/history", { method: "DELETE" }).catch(() => {});
                                setHistory([]);
                            }}
                            className="text-xs text-vox-text-dim hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                        >
                            🗑️ {t.common.clearAll}
                        </button>
                    )}
                </div>
                {history.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {history.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-vox-surface border border-vox-outline/10 rounded-xl hover:border-vox-outline/30 transition-colors">
                                <div className="flex-1 min-w-0 pr-4">
                                    <p className="text-sm text-vox-text truncate">{item.text}</p>
                                    <p className="text-xs text-vox-text-dim mt-1.5 flex items-center gap-3">
                                        {item.controlInstruction && <span className="truncate max-w-[200px]">🎛️ {item.controlInstruction}</span>}
                                        <span>{item.date}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => setCurrentAudio(item.audioUrl)} className="p-2 rounded-full bg-vox-surface-high hover:bg-vox-primary hover:text-white transition-colors">
                                        <Play size={14} />
                                    </button>
                                    <a href={item.audioUrl} download className="p-2 rounded-full text-vox-text-dim hover:text-vox-secondary transition-colors">
                                        <Download size={14} />
                                    </a>
                                    <button
                                        onClick={() => {
                                            const fileName = item.audioUrl.split("/").pop();
                                            if (fileName) {
                                                fetch(`/tts_api/file/${fileName}`, { method: "DELETE" }).catch(() => {});
                                            }
                                            // 🆕 Xóa khỏi database (tìm theo ID nếu có dạng cuid, hoặc xóa tất cả match)
                                            fetch(`/api/history/${item.id}`, { method: "DELETE" }).catch(() => {});
                                            const newHistory = history.filter((h) => h.id !== item.id);
                                            setHistory(newHistory);
                                        }}
                                        className="p-2 rounded-full text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center bg-vox-surface/30 rounded-2xl border border-dashed border-vox-outline/20">
                        <p className="text-vox-text-dim text-sm">{t.studio.recentGenerations.noHistory}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
