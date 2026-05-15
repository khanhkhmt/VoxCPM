"use client";

import Link from "next/link";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/i18n";
import { Languages, Sun, Moon } from "lucide-react";

/**
 * Two-column shell for the auth pages (login / register).
 *
 * Layout (Oriagent design):
 *   - Left:  dark brand panel with logo, headline, animated waveform, features.
 *   - Right: light form panel rendered via {children}.
 *
 * On small screens the left panel collapses and only the form is shown.
 *
 * Theme:
 *   - Right panel uses `bg-vox-surface` so it inherits the existing dark/light theme.
 *   - Left panel is intentionally always dark (`bg-[#1a1917]`) — this matches the
 *     mockup and reads well in either theme.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const { theme, toggleTheme } = useTheme();
    const { language, setLanguage, t } = useI18n();

    return (
        <div className="min-h-screen w-full grid lg:grid-cols-[1fr_460px] bg-vox-bg">
            {/* ── Left brand panel ── */}
            <aside
                className="relative hidden lg:flex flex-col px-12 py-10 overflow-hidden text-white"
                style={{ background: "#1a1917" }}
                aria-hidden="true"
            >
                {/* Soft warm radial glow */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{
                        background:
                            "radial-gradient(ellipse 55% 90% at 38% 55%, rgba(139,44,18,0.55) 0%, rgba(74,21,8,0.35) 28%, rgba(26,8,5,0.2) 55%, rgba(9,8,10,0) 80%)",
                    }}
                />
                <div
                    className="pointer-events-none absolute inset-0 opacity-30"
                    style={{
                        backgroundImage:
                            "linear-gradient(90deg, #060404 0%, transparent 30%, transparent 70%, #060404 100%)",
                    }}
                />

                <BrandLogo />

                <div className="flex-1 flex flex-col justify-center relative z-10 max-w-[480px] py-10">
                    <div className="inline-flex items-center gap-2 self-start mb-6 px-3 py-1.5 rounded-full bg-[rgba(240,104,32,0.1)] border border-[rgba(240,104,32,0.35)] text-[11px] font-semibold uppercase tracking-wider text-[#f59555]">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-ori-accent animate-pulse" />
                        Voice AI Platform
                    </div>

                    <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight mb-5">
                        AI Voice Agent
                        <br />
                        cho mọi{" "}
                        <em
                            className="not-italic bg-clip-text text-transparent"
                            style={{ backgroundImage: "linear-gradient(135deg,#f06820,#f59040)" }}
                        >
                            cuộc gọi
                        </em>
                        .
                    </h1>
                    <p className="text-[15px] leading-[1.75] text-white/50 max-w-[380px] mb-9">
                        Nhân bản, thiết kế và tổng hợp giọng nói bằng AI — hỗ trợ đa ngôn ngữ,
                        realtime streaming và API mạnh mẽ.
                    </p>

                    <Waveform />

                    <ul className="flex flex-col gap-3">
                        {[
                            "Nhân bản giọng nói chỉ với 30 giây âm thanh",
                            "Hỗ trợ tiếng Việt, Anh, Nhật và 20+ ngôn ngữ",
                            "Streaming realtime — độ trễ dưới 300ms",
                            "API tích hợp dễ dàng với mọi nền tảng",
                        ].map((line) => (
                            <li
                                key={line}
                                className="flex items-center gap-2.5 text-[13.5px] text-white/55"
                            >
                                <span
                                    className="block w-1.5 h-1.5 rounded-full bg-ori-accent shrink-0"
                                    style={{ boxShadow: "0 0 6px rgba(240,104,32,0.5)" }}
                                />
                                {line}
                            </li>
                        ))}
                    </ul>
                </div>

                <footer className="relative z-10 text-[11px] text-white/20">
                    © {new Date().getFullYear()} Oriagent. All rights reserved.
                </footer>
            </aside>

            {/* ── Right form panel ── */}
            <section className="relative flex flex-col bg-vox-surface border-l border-vox-outline/20">
                {/* Top utility bar: language + theme */}
                <div className="flex items-center justify-end gap-2 px-6 pt-5">
                    <button
                        type="button"
                        onClick={() => setLanguage(language === "en" ? "vi" : "en")}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface-high transition-colors"
                        title="Switch language"
                        aria-label="Switch language"
                    >
                        <Languages size={14} />
                        <span className="uppercase">{language}</span>
                    </button>
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="p-1.5 rounded-md text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface-high transition-colors"
                        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        aria-label="Toggle theme"
                    >
                        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </div>

                {/* Mobile brand strip (only on small screens) */}
                <div className="lg:hidden px-6 pt-4 pb-2 flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2 text-vox-heading font-bold">
                        <span
                            className="w-7 h-7 rounded-md flex items-center justify-center"
                            style={{ background: "#1a1917" }}
                        >
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ background: "#f06820" }}
                            />
                        </span>
                        Oriagent
                    </Link>
                </div>

                <main className="flex-1 flex flex-col items-center justify-center px-6 py-6 lg:py-10 overflow-y-auto">
                    <div className="w-full max-w-[360px]">{children}</div>
                </main>

                <footer className="px-6 py-4 text-center text-[11px] text-vox-text-dim/70 lg:hidden">
                    © {new Date().getFullYear()} Oriagent. All rights reserved.
                </footer>
                {/* unused tokens placeholder so t is referenced for future i18n hooks */}
                <span className="sr-only">{t.common.signIn}</span>
            </section>
        </div>
    );
}

function BrandLogo() {
    return (
        <Link
            href="/"
            className="flex items-center gap-2.5 self-start relative z-10 text-white font-bold text-lg tracking-tight"
        >
            <span
                className="inline-flex w-9 h-9 items-center justify-center rounded-lg"
                style={{
                    background:
                        "linear-gradient(135deg, rgba(240,104,32,0.95) 0%, rgba(245,144,64,0.85) 100%)",
                    boxShadow: "0 0 14px rgba(240,104,32,0.5)",
                }}
            >
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
                    <path
                        d="M3 8a5 5 0 1 0 10 0c0-2.76-2.24-5-5-5"
                        stroke="#fff"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                    />
                    <circle cx="8" cy="8" r="1.5" fill="#fff" />
                </svg>
            </span>
            Oriagent
        </Link>
    );
}

/**
 * Static SVG waveform with CSS keyframe animation. Deterministic across
 * server / client renders so no hydration warnings.
 */
function Waveform() {
    const bars = [
        0.4, 0.7, 0.3, 0.85, 0.55, 0.95, 0.35, 0.6, 0.45, 0.8, 0.5, 0.7, 0.3,
        0.9, 0.55, 0.4, 0.75, 0.5, 0.85, 0.35, 0.65, 0.45, 0.78, 0.3, 0.6, 0.85,
        0.4, 0.7, 0.5, 0.32,
    ];
    return (
        <div className="flex items-center gap-[3px] h-14 mb-9" aria-hidden="true">
            {bars.map((h, i) => (
                <span
                    key={i}
                    className="block w-[3px] rounded-[2px] origin-center"
                    style={{
                        height: `${Math.round(h * 100)}%`,
                        background:
                            i % 2 === 0
                                ? "rgba(240,104,32,0.5)"
                                : "rgba(255,255,255,0.15)",
                        animation: `oriAuthWave 1.5s ease-in-out ${(i % 7) * 0.08}s infinite`,
                    }}
                />
            ))}
            <style jsx>{`
                @keyframes oriAuthWave {
                    0%,
                    100% {
                        transform: scaleY(0.25);
                        opacity: 0.4;
                    }
                    50% {
                        transform: scaleY(1);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}
