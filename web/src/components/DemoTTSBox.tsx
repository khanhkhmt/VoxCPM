"use client";

import { useState, useRef } from "react";
import { Play, Pause, Lock, Volume2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

const SAMPLE_VOICES = [
    { id: "demo", name: "Oriagent Demo Voice", demoUrl: "/demo_voice.wav" },
];

const SAMPLE_TEXT = "Welcome to Oriagent. We transform your text into lifelike speech with incredible realism. Sign in now to generate your own custom voices.";

export default function DemoTTSBox() {
    const { isLoggedIn } = useAuth();
    const router = useRouter();
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeVoice, setActiveVoice] = useState(SAMPLE_VOICES[0].id);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(5); // Default to 5 seconds
    const audioRef = useRef<HTMLAudioElement>(null);

    const activeVoiceData = SAMPLE_VOICES.find(v => v.id === activeVoice) || SAMPLE_VOICES[0];

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    // Update audio source when voice changes
    const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newVoiceId = e.target.value;
        setActiveVoice(newVoiceId);
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            // The src will update via React, we just need to reset state
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time) || !isFinite(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full max-w-2xl mx-auto rounded-2xl glass-panel overflow-hidden border border-vox-outline/30 shadow-[0_20px_50px_rgba(124,58,237,0.1)]">
            <div className="p-6 relative">
                {/* Glow behind the text area */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-vox-primary/10 blur-[40px] -z-10 rounded-full" />

                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <Volume2 className="text-vox-secondary w-5 h-5" />
                        <h3 className="font-semibold text-vox-text">Hear it in action</h3>
                    </div>

                    <select
                        className="bg-vox-surface-highest border border-vox-outline/40 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-vox-secondary transition-all"
                        value={activeVoice}
                        onChange={handleVoiceChange}
                    >
                        {SAMPLE_VOICES.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>

                <div className="relative mb-6">
                    <div className="bg-vox-surface-lowest/50 border border-vox-outline/20 rounded-xl p-4 min-h-[120px] text-vox-text-dim text-lg leading-relaxed relative overflow-hidden group">
                        {SAMPLE_TEXT}

                        {/* Overlay showing login prompt for custom typing */}
                        <div className="absolute inset-0 bg-vox-bg/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button onClick={() => router.push("/login")} className="flex items-center gap-2 bg-vox-surface-high border border-vox-outline/50 hover:border-vox-primary px-4 py-2 rounded-lg text-sm transition-all shadow-lg text-vox-heading">
                                <Lock size={14} className="text-vox-secondary" />
                                Sign in to enter custom text
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <audio
                        ref={audioRef}
                        src={activeVoiceData.demoUrl}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        onTimeUpdate={(e) => {
                            setCurrentTime(e.currentTarget.currentTime);
                            setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100 || 0);
                        }}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    />
                    <button
                        onClick={togglePlay}
                        className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-vox-primary hover:bg-vox-primary/90 text-white transition-all shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                    >
                        {isPlaying ? <Pause className="fill-white" /> : <Play className="fill-white ml-1" />}
                    </button>

                    <div className="flex-grow h-1.5 bg-vox-surface-highest rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                        if (audioRef.current && duration) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const percentage = x / rect.width;
                            audioRef.current.currentTime = percentage * duration;
                        }
                    }}>
                        <div className="h-full bg-vox-secondary transition-all duration-75" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs text-vox-text-dim font-mono min-w-[70px] text-right">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>
            </div>

            {!isLoggedIn && (
                <div className="bg-vox-primary/10 border-t border-vox-outline/20 p-4 text-center">
                    <p className="text-sm text-vox-text-dim">
                        Want to try with your own text? <button onClick={() => router.push("/login")} className="text-vox-secondary hover:text-vox-heading transition-colors ml-1 font-medium underline underline-offset-4">Sign in to generate - It&apos;s Free</button>
                    </p>
                </div>
            )}
        </div>
    );
}
