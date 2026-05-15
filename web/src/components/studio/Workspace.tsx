"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { generateSpeech } from "@/lib/tts";
import { useAuth } from "@/lib/auth";
import { StreamingTTSPanel } from "@/components/studio/StreamingTTSPanel";
import { useVoiceSelection } from "@/lib/stores/voice-selection";
import { useI18n } from "@/i18n";
import {
    SlidersHorizontal, Type, Play, Mic, Waves, Download,
    CheckCircle2, RotateCcw, History as HistoryIcon,
    Upload, X, FileAudio, ChevronDown, ChevronUp,
    Lightbulb, AlertTriangle, Loader2, Trash2, Zap, Globe,
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

interface HistoryApiItem {
    id: string;
    text: string;
    audioUrl: string;
    createdAt: string;
    controlInstruction: string | null;
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
// Reusable presentation helpers (Oriagent design language)
// ---------------------------------------------------------------------------
function Card({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <section className={`ori-card ${className}`}>{children}</section>;
}

function CardHeader({
    title,
    icon,
    badge,
    right,
}: {
    title: React.ReactNode;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
    right?: React.ReactNode;
}) {
    return (
        <div className="ori-card-header">
            {icon}
            <h3 className="ori-card-title">{title}</h3>
            {badge && <span className="ori-card-badge">{badge}</span>}
            {right}
        </div>
    );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`ori-toggle ${on ? "on" : ""}`}
            aria-pressed={on}
            aria-label={label ?? "Toggle"}
        />
    );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Workspace() {
    const { user } = useAuth();
    const { t } = useI18n();
    const selectedLibraryVoice = useVoiceSelection((s) => s.selected);
    const setSelectedVoice = useVoiceSelection((s) => s.setSelected);
    const clearLibraryVoice = useCallback(() => setSelectedVoice(null), [setSelectedVoice]);

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
                    const mapped = (json.data.items as HistoryApiItem[]).map((item) => ({
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

    // Load history when user changes or on tab focus
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
        const name = prompt(
            "Enter a name for this voice:",
            refAudioFile.name.replace(/\.[^.]+$/, ""),
        );
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
            let voiceFeatureUrl: string | null = null;
            let referenceWav: File | null = refAudioFile;

            if (selectedLibraryVoice) {
                if (selectedLibraryVoice.featureUrl) {
                    voiceFeatureUrl = selectedLibraryVoice.featureUrl;
                    referenceWav = null;
                } else if (selectedLibraryVoice.audioUrl) {
                    try {
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

                // --- Persist to database (fire-and-forget, do not block UI) ---
                const tempId = newItem.id;
                fetch("/api/history", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text,
                        controlInstruction: ultimateCloning ? "" : controlInstruction,
                        audioUrl: result.audioUrl,
                        language,
                        cfgValue,
                        ditSteps,
                        doNormalize,
                        denoise,
                        usePromptText: ultimateCloning,
                        promptText,
                        voiceProfileId: activeVoiceProfileId,
                    }),
                })
                    .then(async (res) => {
                        const json = await res.json();
                        if (res.ok && json.data?.id) {
                            const dbId = json.data.id;
                            const r2Url = json.data.audioUrl;
                            setHistory((prev) =>
                                prev.map((h) =>
                                    h.id === tempId
                                        ? { ...h, id: dbId, audioUrl: r2Url || h.audioUrl }
                                        : h,
                                ),
                            );
                            if (r2Url) setCurrentAudio(r2Url);
                        }
                    })
                    .catch((err) => {
                        console.error("[History Save Error]", err);
                    });
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStreamingDone = useCallback(
        (audioUrl: string) => {
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
                    text,
                    controlInstruction: ultimateCloning ? "" : controlInstruction,
                    audioUrl: audioUrl,
                    language,
                    cfgValue,
                    ditSteps,
                    doNormalize,
                    denoise,
                    usePromptText: ultimateCloning,
                    promptText,
                    voiceProfileId: activeVoiceProfileId,
                }),
            })
                .then(async (res) => {
                    const json = await res.json();
                    if (res.ok && json.data?.id) {
                        const dbId = json.data.id;
                        const r2Url = json.data.audioUrl;
                        setHistory((prev) =>
                            prev.map((h) =>
                                h.id === tempId
                                    ? { ...h, id: dbId, audioUrl: r2Url || h.audioUrl }
                                    : h,
                            ),
                        );
                        if (r2Url) setStreamingFinalUrl(r2Url);
                    }
                })
                .catch((err) => {
                    console.error("[Streaming History Save Error]", err);
                });
        },
        [
            text,
            controlInstruction,
            ultimateCloning,
            promptText,
            language,
            cfgValue,
            ditSteps,
            doNormalize,
            denoise,
            activeVoiceProfileId,
            history,
        ],
    );

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
        <div className="flex flex-col gap-5">
            {/* Two-column grid: 1fr + fixed-width settings rail */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

                {/* ========== LEFT COLUMN ========== */}
                <div className="flex flex-col gap-4 min-w-0">

                    {/* ── Reference Audio Card ── */}
                    <Card>
                        <CardHeader
                            icon={<FileAudio size={14} strokeWidth={1.7} className="text-vox-text-dim" />}
                            title={t.studio.referenceAudio.title}
                            badge={t.studio.referenceAudio.optional}
                        />
                        <div className="ori-card-body flex flex-col gap-3">
                            {/* Voice Library Selector */}
                            {libraryVoices.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11.5px] font-medium text-vox-text-dim">
                                        {t.studio.referenceAudio.pickFromLibrary}
                                    </label>
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
                                        className="ori-input cursor-pointer"
                                    >
                                        <option value="">— {t.common.none} —</option>
                                        {libraryVoices.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.name} {v.featureUrl ? "⚡" : ""}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10.5px] text-vox-text-dim flex items-center gap-1">
                                        <Zap size={10} className="text-amber-500" />
                                        = {t.studio.referenceAudio.hasFeatureCache}
                                    </p>
                                </div>
                            )}

                            {/* Selected library voice / file preview / dropzone */}
                            {selectedLibraryVoice ? (
                                <div className="flex items-center gap-3 bg-vox-surface-high border border-vox-outline rounded-[7px] p-3">
                                    <div
                                        className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                                        style={{ background: "var(--ori-surface-3)" }}
                                    >
                                        <Mic size={16} strokeWidth={1.7} className="text-vox-text-dim" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-vox-text truncate">
                                            {t.studio.referenceAudio.using} {selectedLibraryVoice.name}
                                        </p>
                                        {selectedLibraryVoice.featureUrl && (
                                            <p className="text-[11px] text-amber-500 flex items-center gap-1">
                                                <Zap size={10} /> {t.studio.referenceAudio.featureCached}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearLibraryVoice}
                                        className="p-1.5 rounded-md text-vox-text-dim hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                        title={t.studio.referenceAudio.clearSelection}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : refAudioFile ? (
                                <div className="flex items-center gap-3 bg-vox-surface-high border border-vox-outline rounded-[7px] p-3">
                                    <div
                                        className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                                        style={{ background: "var(--ori-surface-3)" }}
                                    >
                                        <FileAudio size={16} strokeWidth={1.7} className="text-vox-text-dim" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] text-vox-text truncate">{refAudioFile.name}</p>
                                        <p className="text-[11px] text-vox-text-dim">
                                            {(refAudioFile.size / 1024).toFixed(0)} KB
                                        </p>
                                    </div>
                                    {refAudioPreview && (
                                        <audio
                                            controls
                                            src={refAudioPreview}
                                            className="h-8 w-36 shrink-0"
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleSaveReferenceToLibrary}
                                        disabled={isSavingVoice}
                                        className="ori-btn ori-btn-ghost shrink-0 disabled:opacity-50"
                                        title={t.studio.referenceAudio.saveToLibrary}
                                    >
                                        {isSavingVoice ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <Download size={12} />
                                        )}
                                        <span className="hidden sm:inline">{t.common.save}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearRefAudio}
                                        className="p-1.5 rounded-md text-vox-text-dim hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                        title="Remove"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleFileDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-[1.5px] border-dashed border-vox-outline hover:border-vox-text-dim rounded-[10px] py-7 px-5 text-center cursor-pointer transition-colors bg-vox-surface-high hover:bg-vox-surface-highest group"
                                >
                                    <div
                                        className="w-10 h-10 rounded-[10px] flex items-center justify-center mx-auto mb-2.5"
                                        style={{ background: "var(--ori-surface)", border: "1px solid var(--ori-border)" }}
                                    >
                                        <Upload size={18} strokeWidth={1.7} className="text-vox-text-dim" />
                                    </div>
                                    <p className="text-[13px] text-vox-text-dim mb-1">
                                        {t.studio.referenceAudio.dropAudio}
                                    </p>
                                    <p className="text-[11px] text-vox-text-dim/80">
                                        {t.studio.referenceAudio.audioFormats}
                                    </p>
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

                            {/* Ultimate Cloning toggle */}
                            {(refAudioFile || selectedLibraryVoice) && (
                                <div className="flex flex-col gap-3 mt-1">
                                    <div className="flex items-center justify-between p-3 bg-vox-surface-high border border-vox-outline rounded-[7px]">
                                        <div className="min-w-0 pr-3">
                                            <p className="text-[13px] font-medium text-vox-text flex items-center gap-1.5">
                                                🎙️ {t.studio.ultimateCloning.title}
                                            </p>
                                            <p className="text-[11px] text-vox-text-dim mt-0.5">
                                                {t.studio.ultimateCloning.desc}
                                            </p>
                                        </div>
                                        <Toggle
                                            on={ultimateCloning}
                                            onClick={() => setUltimateCloning(!ultimateCloning)}
                                            label="Ultimate cloning"
                                        />
                                    </div>

                                    {ultimateCloning && (
                                        <div className="bg-vox-surface-high border border-vox-outline rounded-[7px] p-3.5 flex flex-col gap-2">
                                            <label className="text-[12px] font-medium text-vox-text flex items-center gap-2">
                                                {t.studio.ultimateCloning.transcriptTitle}
                                                <span className="ori-card-badge">
                                                    {t.studio.ultimateCloning.editable}
                                                </span>
                                            </label>
                                            <textarea
                                                className="ori-input resize-none min-h-[80px]"
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
                        </div>
                    </Card>

                    {/* ── Control Instruction Card ── */}
                    <Card
                        className={`transition-opacity ${ultimateCloning ? "opacity-50 pointer-events-none" : ""}`}
                    >
                        <CardHeader
                            icon={<SlidersHorizontal size={14} strokeWidth={1.7} className="text-vox-text-dim" />}
                            title={t.studio.controlInstruction.title}
                            badge={t.studio.controlInstruction.voiceDesign}
                            right={
                                ultimateCloning ? (
                                    <span className="text-[10.5px] text-amber-600 ml-2">
                                        {t.studio.ultimateCloning.disabled}
                                    </span>
                                ) : null
                            }
                        />
                        <div className="ori-card-body flex flex-col gap-2">
                            <input
                                type="text"
                                className="ori-input"
                                placeholder='e.g. "A middle-aged man with a deep, rasping voice, speaking slowly and calmly."'
                                value={controlInstruction}
                                onChange={(e) => setControlInstruction(e.target.value)}
                                disabled={ultimateCloning}
                            />
                            <p className="text-[11.5px] text-vox-text-dim leading-relaxed">
                                {t.studio.controlInstruction.desc}{" "}
                                <code className="text-vox-text px-1 rounded bg-vox-surface-high">
                                    (instruction)text
                                </code>
                                .
                            </p>
                        </div>
                    </Card>

                    {/* ── Target Text Card ── */}
                    <Card>
                        <CardHeader
                            icon={<Type size={14} strokeWidth={1.7} className="text-vox-text-dim" />}
                            title={t.studio.targetText.title}
                            right={
                                <span className="text-[11px] text-vox-text-dim">
                                    {text.length} / 4096
                                </span>
                            }
                        />
                        <div className="ori-card-body">
                            <textarea
                                className="ori-input resize-none min-h-[180px] leading-relaxed"
                                placeholder={t.studio.targetText.placeholder}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                            />
                        </div>
                    </Card>

                    {/* ── Examples Card (collapsible) ── */}
                    <Card>
                        <button
                            type="button"
                            onClick={() => setShowExamples(!showExamples)}
                            className="w-full ori-card-header bg-transparent border-0 cursor-pointer flex items-center gap-2 hover:bg-vox-surface-high transition-colors"
                            style={{ borderBottom: showExamples ? "1px solid var(--ori-border)" : "none" }}
                        >
                            <Lightbulb size={14} strokeWidth={1.7} className="text-amber-500" />
                            <span className="ori-card-title text-left">{t.studio.examplePrompts}</span>
                            {showExamples ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {showExamples && (
                            <div className="ori-card-body flex flex-col gap-2.5">
                                {EXAMPLES.map((ex, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => applyExample(ex)}
                                        className="w-full text-left p-3 bg-vox-surface-high border border-vox-outline rounded-[7px] hover:border-vox-text-dim transition-colors"
                                    >
                                        <p className="text-[13px] font-medium text-vox-text">{ex.title}</p>
                                        <p className="text-[11.5px] text-vox-text-dim mt-1 line-clamp-1">
                                            <span className="text-vox-text">Control:</span> {ex.control}
                                        </p>
                                        <p className="text-[11.5px] text-vox-text-dim mt-0.5 line-clamp-1">
                                            <span className="text-vox-text">Text:</span> {ex.text}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* ── Error ── */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-200 p-3.5 rounded-[10px] text-[13px] flex items-start gap-2.5">
                            <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">{t.studio.generationFailed}</p>
                                <p className="opacity-90">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* ── Streaming-mode panel OR Output audio card ── */}
                    {isStreamingMode ? (
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
                    ) : (
                        <Card>
                            <CardHeader
                                icon={<Play size={14} strokeWidth={1.7} className="text-vox-text-dim" />}
                                title={t.studio.generatedAudio.title}
                                right={
                                    currentAudio ? (
                                        <span className="flex items-center gap-1 text-[10.5px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                            <CheckCircle2 size={11} /> {t.studio.generatedAudio.ready}
                                        </span>
                                    ) : null
                                }
                            />
                            <div className="ori-card-body">
                                {isGenerating ? (
                                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                                        <div className="flex gap-1 items-end h-7">
                                            {[...Array(12)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="w-1 rounded-full animate-pulse"
                                                    style={{
                                                        background: "var(--color-ori-accent)",
                                                        height: `${12 + ((i * 7) % 18)}px`,
                                                        animationDelay: `${i * 0.1}s`,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[12.5px] text-vox-text-dim">
                                            {t.studio.generatedAudio.generatingMsg}
                                        </p>
                                    </div>
                                ) : currentAudio ? (
                                    <div className="flex items-center gap-3 bg-vox-surface-high border border-vox-outline rounded-[10px] p-3">
                                        <audio
                                            ref={audioRef}
                                            controls
                                            src={currentAudio}
                                            className="w-full h-10"
                                            autoPlay
                                        />
                                        <a
                                            href={currentAudio}
                                            download="voxora-synthesis.wav"
                                            className="p-2.5 rounded-md bg-vox-surface border border-vox-outline hover:border-vox-text-dim transition-colors text-vox-text-dim hover:text-vox-text shrink-0"
                                            title="Download"
                                        >
                                            <Download size={16} />
                                        </a>
                                    </div>
                                ) : (
                                    <div className="text-center py-9 flex flex-col items-center">
                                        <div
                                            className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-3"
                                            style={{
                                                background: "var(--ori-surface-2)",
                                                border: "1px solid var(--ori-border)",
                                            }}
                                        >
                                            <Waves size={22} strokeWidth={1.5} className="text-vox-text-dim/70" />
                                        </div>
                                        <p className="text-[13px] font-medium text-vox-text-dim mb-1">
                                            {t.studio.generatedAudio.noAudio}
                                        </p>
                                        <p className="text-[11.5px] text-vox-text-dim/70">
                                            {t.studio.generatedAudio.noAudioHint}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* ── History Card ── */}
                    <Card>
                        <CardHeader
                            icon={<HistoryIcon size={14} strokeWidth={1.7} className="text-vox-text-dim" />}
                            title={t.studio.recentGenerations.title}
                            right={
                                history.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            for (const item of history) {
                                                const fileName = item.audioUrl.split("/").pop();
                                                if (fileName) {
                                                    fetch(`/tts_api/file/${fileName}`, {
                                                        method: "DELETE",
                                                    }).catch(() => {});
                                                }
                                            }
                                            fetch("/api/history", { method: "DELETE" }).catch(() => {});
                                            setHistory([]);
                                        }}
                                        className="ori-btn ori-btn-danger"
                                    >
                                        <Trash2 size={12} /> {t.common.clearAll}
                                    </button>
                                ) : null
                            }
                        />
                        {history.length > 0 ? (
                            <div className="ori-card-body flex flex-col gap-2">
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-3 p-3 bg-vox-surface-high border border-vox-outline rounded-[7px] hover:border-vox-text-dim/60 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] text-vox-text truncate">{item.text}</p>
                                            <p className="text-[11px] text-vox-text-dim mt-1 flex items-center gap-3">
                                                {item.controlInstruction && (
                                                    <span className="truncate max-w-[200px]">
                                                        🎛️ {item.controlInstruction}
                                                    </span>
                                                )}
                                                <span>{item.date}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentAudio(item.audioUrl)}
                                                className="p-1.5 rounded-md text-vox-text-dim hover:text-vox-text hover:bg-vox-surface-highest transition-colors"
                                                title="Play"
                                            >
                                                <Play size={13} />
                                            </button>
                                            <a
                                                href={item.audioUrl}
                                                download
                                                className="p-1.5 rounded-md text-vox-text-dim hover:text-vox-text hover:bg-vox-surface-highest transition-colors"
                                                title="Download"
                                            >
                                                <Download size={13} />
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const fileName = item.audioUrl.split("/").pop();
                                                    if (fileName) {
                                                        fetch(`/tts_api/file/${fileName}`, {
                                                            method: "DELETE",
                                                        }).catch(() => {});
                                                    }
                                                    fetch(`/api/history/${item.id}`, {
                                                        method: "DELETE",
                                                    }).catch(() => {});
                                                    setHistory(history.filter((h) => h.id !== item.id));
                                                }}
                                                className="p-1.5 rounded-md text-vox-text-dim hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-5 px-5 text-center">
                                <p className="text-[12px] text-vox-text-dim">
                                    {t.studio.recentGenerations.noHistory}
                                </p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* ========== RIGHT COLUMN: Settings ========== */}
                <aside className="flex flex-col gap-4 xl:sticky xl:top-4">
                    <Card>
                        <CardHeader
                            icon={<Mic size={14} strokeWidth={1.7} className="text-vox-text-dim" />}
                            title={t.studio.synthesisSettings.title}
                        />
                        <div className="ori-card-body flex flex-col">
                            {/* Language */}
                            <div className="flex items-start justify-between gap-3 py-3 border-b border-vox-outline first:pt-0">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] font-medium text-vox-text flex items-center gap-1.5">
                                        <Globe size={12} strokeWidth={1.7} />
                                        {t.studio.synthesisSettings.normLanguage}
                                    </p>
                                    <p className="text-[11px] text-vox-text-dim mt-0.5 leading-snug">
                                        {t.studio.synthesisSettings.normLanguageHint}
                                    </p>
                                </div>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="ori-input !w-auto !py-1.5 !px-2.5 !text-[12px] shrink-0 cursor-pointer"
                                >
                                    <option value="auto">{t.studio.synthesisSettings.autoDetect}</option>
                                    <option value="vi">Tiếng Việt</option>
                                    <option value="zh">中文</option>
                                    <option value="en">English</option>
                                </select>
                            </div>

                            {/* CFG */}
                            <div className="py-3 border-b border-vox-outline">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[12.5px] font-medium text-vox-text">
                                        {t.studio.synthesisSettings.guidanceScale} <span className="text-vox-text-dim">(CFG)</span>
                                    </p>
                                    <span className="text-[11px] font-mono text-vox-text bg-vox-surface-high border border-vox-outline rounded px-2 py-0.5">
                                        {cfgValue.toFixed(1)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="1.0"
                                    max="3.0"
                                    step="0.1"
                                    value={cfgValue}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        if (Number.isFinite(v)) setCfgValue(v);
                                    }}
                                    className="ori-range"
                                />
                                <div className="flex justify-between text-[10px] text-vox-text-dim mt-1">
                                    <span>{t.studio.synthesisSettings.creative}</span>
                                    <span>{t.studio.synthesisSettings.accurate}</span>
                                </div>
                            </div>

                            {/* DiT Steps */}
                            <div className="py-3 border-b border-vox-outline">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[12.5px] font-medium text-vox-text">
                                        {t.studio.synthesisSettings.inferenceSteps}
                                    </p>
                                    <span className="text-[11px] font-mono text-vox-text bg-vox-surface-high border border-vox-outline rounded px-2 py-0.5">
                                        {ditSteps}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    step="1"
                                    value={ditSteps}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value, 10);
                                        if (Number.isFinite(v)) setDitSteps(v);
                                    }}
                                    className="ori-range"
                                />
                                <div className="flex justify-between text-[10px] text-vox-text-dim mt-1">
                                    <span>{t.studio.synthesisSettings.faster}</span>
                                    <span>{t.studio.synthesisSettings.higherQuality}</span>
                                </div>
                            </div>

                            {/* Denoise Toggle */}
                            <div className="flex items-start justify-between gap-3 py-3 border-b border-vox-outline">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] font-medium text-vox-text">
                                        {t.studio.synthesisSettings.refAudioDenoising}
                                    </p>
                                    <p className="text-[11px] text-vox-text-dim mt-0.5 leading-snug">
                                        {t.studio.synthesisSettings.refAudioDenoisingDesc}
                                    </p>
                                </div>
                                <Toggle on={denoise} onClick={() => setDenoise(!denoise)} label="Denoise" />
                            </div>

                            {/* Normalize Toggle */}
                            <div className="flex items-start justify-between gap-3 py-3 last:pb-0">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] font-medium text-vox-text">
                                        {t.studio.synthesisSettings.textNormalization}
                                    </p>
                                    <p className="text-[11px] text-vox-text-dim mt-0.5 leading-snug">
                                        {t.studio.synthesisSettings.textNormalizationDesc}
                                    </p>
                                </div>
                                <Toggle
                                    on={doNormalize}
                                    onClick={() => setDoNormalize(!doNormalize)}
                                    label="Normalize"
                                />
                            </div>
                        </div>
                    </Card>
                </aside>
            </div>

            {/* ========== STICKY ACTION BAR ========== */}
            <div className="sticky bottom-4 z-20 mt-2">
                <div className="flex items-center gap-3 bg-vox-surface border border-vox-outline rounded-[12px] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    {/* Mode toggle */}
                    <div className="flex bg-vox-surface-high border border-vox-outline rounded-md p-[3px]">
                        <button
                            type="button"
                            onClick={() => setIsStreamingMode(false)}
                            className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
                                !isStreamingMode
                                    ? "bg-vox-surface text-vox-text shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                                    : "text-vox-text-dim hover:text-vox-text"
                            }`}
                        >
                            {t.studio.batchMode}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsStreamingMode(true)}
                            className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
                                isStreamingMode
                                    ? "bg-vox-surface text-vox-text shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                                    : "text-vox-text-dim hover:text-vox-text"
                            }`}
                        >
                            {t.studio.streamingMode} ⚡
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={isGenerating}
                        className="ori-btn ori-btn-ghost ml-auto disabled:opacity-40"
                    >
                        <RotateCcw size={12} />
                        {t.common.clear}
                    </button>

                    {!isStreamingMode && (
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="ori-btn ori-btn-accent !px-5 !py-2.5 !text-[13px]"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    {t.studio.synthesizing}
                                </>
                            ) : (
                                <>
                                    <Waves size={14} />
                                    {t.studio.generateSpeech}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
