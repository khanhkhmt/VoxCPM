"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { generateSpeech } from "@/lib/tts";
import { useAuth } from "@/lib/auth";
import { GlassCard } from "@/components/GlassCard";
import {
    SlidersHorizontal, Type, Play, Mic, Waves, Download,
    CheckCircle2, RotateCcw, History as HistoryIcon,
    Upload, X, FileAudio, ChevronDown, ChevronUp,
    Lightbulb, AlertTriangle, Loader2, Trash2,
} from "lucide-react";

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

    // localStorage key riêng cho từng tài khoản
    const historyKey = user ? `voxora_history_${user.id}` : null;

    // ---- TTS State (REAL) ----
    const [text, setText] = useState("");
    const [controlInstruction, setControlInstruction] = useState("");
    const [cfgValue, setCfgValue] = useState(2.0);
    const [ditSteps, setDitSteps] = useState(6);
    const [doNormalize, setDoNormalize] = useState(false);
    const [denoise, setDenoise] = useState(false);

    // ---- Reference audio (REAL) ----
    const [refAudioFile, setRefAudioFile] = useState<File | null>(null);
    const [refAudioPreview, setRefAudioPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ---- Ultimate Cloning (REAL) ----
    const [ultimateCloning, setUltimateCloning] = useState(false);
    const [promptText, setPromptText] = useState("");

    // ---- Language Selection (REAL) ----
    const [language, setLanguage] = useState("auto");

    // ---- App State ----
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [currentAudio, setCurrentAudio] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [showExamples, setShowExamples] = useState(false);

    // Load history khi user thay đổi (đăng nhập/đăng xuất/đổi tài khoản)
    useEffect(() => {
        if (!historyKey) {
            setHistory([]);
            return;
        }
        const saved = localStorage.getItem(historyKey);
        if (saved) {
            try { setHistory(JSON.parse(saved)); } catch { setHistory([]); }
        } else {
            setHistory([]);
        }
    }, [historyKey]);

    // ---- Reference audio helpers ----
    const handleFileSelect = useCallback((file: File) => {
        setRefAudioFile(file);
        setRefAudioPreview(URL.createObjectURL(file));

        // --- 🆕 Auto-save to Voice Library (fire-and-forget) ---
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name.replace(/\.[^.]+$/, ""));
        formData.append("description", "Auto-saved from Studio");
        fetch("/api/voices", { method: "POST", body: formData })
            .then(async (res) => {
                if (res.ok) console.log("[Voice Library] Auto-saved:", file.name);
                else console.warn("[Voice Library] Save failed:", await res.text());
            })
            .catch(() => {});
    }, []);

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
        if (ultimateCloning) {
            setUltimateCloning(false);
            setPromptText("");
        }
    }, [refAudioPreview, ultimateCloning]);

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
            const result = await generateSpeech({
                text,
                controlInstruction: ultimateCloning ? "" : controlInstruction,
                referenceWav: refAudioFile,
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
                if (historyKey) localStorage.setItem(historyKey, JSON.stringify(newHistory));

                // --- 🆕 Persist to database (fire-and-forget, không block UI) ---
                const tempId = newItem.id;
                fetch("/api/history", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text, controlInstruction: ultimateCloning ? "" : controlInstruction,
                        audioUrl: result.audioUrl, language, cfgValue, ditSteps,
                        doNormalize, denoise, usePromptText: ultimateCloning, promptText,
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
                            if (historyKey) localStorage.setItem(historyKey, JSON.stringify(updated));
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
                            Reference Audio
                            <span className="text-xs text-vox-text-dim ml-1">(optional — for voice cloning)</span>
                        </label>

                        {refAudioFile ? (
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
                                    Drop audio file here or <span className="text-vox-secondary underline underline-offset-2">browse</span>
                                </p>
                                <p className="text-xs text-vox-text-dim mt-1">WAV, MP3, FLAC — max 30s recommended</p>
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
                        {refAudioFile && (
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center justify-between p-3 bg-vox-surface rounded-xl border border-vox-outline/10">
                                    <div>
                                        <div className="text-sm font-medium flex items-center gap-2">
                                            🎙️ Ultimate Cloning Mode
                                        </div>
                                        <div className="text-xs text-vox-text-dim mt-0.5 max-w-xs">
                                            Reproduces every vocal nuance through audio continuation. Disables Control Instruction.
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
                                            Transcript of Reference Audio
                                            <span className="text-[10px] text-vox-text-dim bg-vox-surface px-2 py-0.5 rounded-full">editable</span>
                                        </label>
                                        <textarea
                                            className="w-full bg-transparent border border-vox-outline/20 rounded-lg px-4 py-2.5 text-sm text-vox-text outline-none focus:border-vox-secondary transition-colors resize-none min-h-[80px]"
                                            placeholder="Paste or type the transcript of your reference audio here. If you're unsure, leave blank and the model will still attempt continuation."
                                            value={promptText}
                                            onChange={(e) => setPromptText(e.target.value)}
                                        />
                                        <p className="text-[11px] text-vox-text-dim">
                                            💡 For best results, provide an accurate transcript so the model knows exactly where the reference audio ends.
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
                                Control Instruction
                                <span className="text-xs text-vox-secondary ml-2 bg-vox-secondary/10 px-2 rounded-full hidden sm:inline-block">Voice Design</span>
                                {ultimateCloning && (
                                    <span className="text-xs text-amber-400 ml-auto">Disabled in Ultimate Cloning mode</span>
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
                                Describe the target timbre, emotion, age, or style. This is prepended to the target text as <code className="text-vox-secondary">(instruction)text</code>.
                            </p>
                        </div>
                    </GlassCard>

                    {/* --- Target Text --- */}
                    <GlassCard className="flex-1 min-h-[300px] flex flex-col relative group !p-1">
                        <div className="px-5 py-3 border-b border-vox-outline/20 flex justify-between items-center bg-vox-surface/50 rounded-t-2xl">
                            <div className="flex items-center gap-2 text-vox-text">
                                <Type size={16} className="text-vox-secondary" />
                                <span className="font-medium text-sm font-semibold tracking-wide">Target Text</span>
                            </div>
                            <span className="text-xs text-vox-text-dim px-2 bg-vox-surface rounded-full border border-vox-outline/30">{text.length} / 4096</span>
                        </div>
                        <textarea
                            className="w-full flex-1 bg-transparent border-none outline-none resize-none p-5 text-vox-text placeholder-vox-text-dim/50 leading-relaxed"
                            placeholder="Enter the text you want to synthesize here. Use natural phrasing and punctuation for best results..."
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
                                <Mic size={16} className="text-vox-secondary" /> Synthesis Settings
                            </h3>
                        </div>

                        <div className="p-5 flex flex-col gap-6">
                            {/* Language Selection */}
                            <div>
                                <label className="block text-xs font-medium text-vox-text-dim mb-1.5 ml-1 uppercase tracking-wider">🌐 Normalization Language</label>
                                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-vox-surface border border-vox-outline/30 rounded-lg px-3 py-2 text-sm text-vox-text outline-none focus:border-vox-primary">
                                    <option value="auto">Auto-Detect</option>
                                    <option value="vi">Tiếng Việt</option>
                                    <option value="zh">中文 (Chinese)</option>
                                    <option value="en">English</option>
                                </select>
                                <p className="text-[10px] text-vox-text-dim mt-1 ml-1">
                                    Selects which text normalizer to use (numbers, dates, currency → words). Enable &quot;Text Normalization&quot; below for this to take effect.
                                </p>
                            </div>

                            <div className="w-full h-px bg-vox-outline/20" />

                            {/* --- REAL Parameters --- */}
                            <div className="space-y-5">
                                {/* CFG */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium text-vox-text">Guidance Scale (CFG)</label>
                                        <span className="text-xs font-mono text-vox-secondary bg-vox-surface px-2 py-0.5 rounded">{cfgValue.toFixed(1)}</span>
                                    </div>
                                    <input type="range" min="1.0" max="3.0" step="0.1" value={cfgValue} onChange={(e) => setCfgValue(parseFloat(e.target.value))} className="w-full accent-vox-primary h-1.5 bg-vox-surface-high rounded-full appearance-none outline-none cursor-pointer" />
                                    <div className="flex justify-between text-[10px] text-vox-text-dim mt-1">
                                        <span>Creative</span><span>Accurate</span>
                                    </div>
                                </div>

                                {/* Inference Steps */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium text-vox-text">Inference Steps</label>
                                        <span className="text-xs font-mono text-vox-secondary bg-vox-surface px-2 py-0.5 rounded">{ditSteps}</span>
                                    </div>
                                    <input type="range" min="1" max="50" step="1" value={ditSteps} onChange={(e) => setDitSteps(parseInt(e.target.value))} className="w-full accent-vox-primary h-1.5 bg-vox-surface-high rounded-full appearance-none outline-none cursor-pointer" />
                                    <div className="flex justify-between text-[10px] text-vox-text-dim mt-1">
                                        <span>Faster</span><span>Higher quality</span>
                                    </div>
                                </div>

                                {/* Denoise Toggle */}
                                <div className="flex items-center justify-between p-3 bg-vox-surface-low rounded-xl border border-vox-outline/10">
                                    <div>
                                        <div className="text-sm font-medium">Reference Audio Denoising</div>
                                        <div className="text-xs text-vox-text-dim">Apply ZipEnhancer before cloning</div>
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
                                        <div className="text-sm font-medium">Text Normalization</div>
                                        <div className="text-xs text-vox-text-dim">Format numbers, dates, abbreviations</div>
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
                                <Lightbulb size={14} className="text-amber-400" /> Example Prompts
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
                                        <p className="text-sm font-medium text-vox-text group-hover:text-white transition-colors">{ex.title}</p>
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
                        <p className="font-semibold text-red-400">Generation Failed</p>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* ========== ACTION BAR ========== */}
            <div className="flex items-center justify-between bg-vox-surface/80 backdrop-blur-xl p-4 rounded-2xl border border-vox-outline/20 sticky bottom-6 shadow-2xl z-20">
                <button onClick={handleClear} className="px-4 py-2 text-sm text-vox-text-dim hover:text-white flex items-center gap-2 transition-colors" disabled={isGenerating}>
                    <RotateCcw size={16} /> Clear
                </button>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className={`relative group overflow-hidden rounded-xl font-semibold px-10 py-3.5 transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] ${isGenerating ? "bg-vox-surface-high text-vox-text-dim cursor-wait" : "bg-vox-primary text-white hover:shadow-[0_0_30px_rgba(124,58,237,0.7)]"}`}
                >
                    <span className="relative z-10 flex items-center gap-2">
                        {isGenerating ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Synthesizing…
                            </>
                        ) : (
                            <>
                                <Waves size={18} /> Generate Speech
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
                    <Play className="text-vox-secondary" size={18} /> Generated Audio
                </h3>

                {isGenerating ? (
                    /* Loading state */
                    <div className="flex flex-col items-center justify-center py-10 gap-4">
                        <div className="flex gap-1 items-end h-8">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="w-1 bg-vox-primary rounded-full animate-pulse" style={{ height: `${12 + Math.random() * 20}px`, animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                        <p className="text-sm text-vox-text-dim">Generating audio… this may take a moment.</p>
                    </div>
                ) : currentAudio ? (
                    /* Success state */
                    <>
                        <div className="absolute top-4 right-4">
                            <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                                <CheckCircle2 size={12} /> Ready
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
                        <p className="text-sm">No audio generated yet.</p>
                        <p className="text-xs mt-1">Enter text above and click <strong className="text-vox-text">Generate Speech</strong> to begin.</p>
                    </div>
                )}
            </GlassCard>

            {/* ========== HISTORY ========== */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-vox-text-dim uppercase tracking-wider flex items-center gap-2">
                        <HistoryIcon size={16} /> Recent Generations
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
                                if (historyKey) localStorage.removeItem(historyKey);
                            }}
                            className="text-xs text-vox-text-dim hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                        >
                            🗑️ Clear all
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
                                            if (historyKey) localStorage.setItem(historyKey, JSON.stringify(newHistory));
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
                        <p className="text-vox-text-dim text-sm">No recent generations. Your synthesis history will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
