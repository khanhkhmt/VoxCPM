"use client";

import { useI18n, type Language } from "@/i18n";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface LanguageSelectorProps {
    variant?: "compact" | "full";
}

const LANGUAGES: { code: Language; label: string; short: string }[] = [
    { code: "en", label: "English", short: "EN" },
    { code: "vi", label: "Tiếng Việt", short: "VI" },
];

export default function LanguageSelector({ variant = "compact" }: LanguageSelectorProps) {
    const { language, setLanguage, t } = useI18n();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (variant === "full") {
        return (
            <div className="flex gap-2">
                {LANGUAGES.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                            language === lang.code
                                ? "bg-vox-primary/10 border-vox-primary/30 text-vox-primary"
                                : "bg-vox-surface-low border-vox-outline/20 text-vox-text-dim hover:text-vox-heading"
                        }`}
                    >
                        <Globe size={16} /> {lang.label}
                    </button>
                ))}
            </div>
        );
    }

    // Compact dropdown for navbar
    const current = LANGUAGES.find((l) => l.code === language)!;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-vox-text-dim hover:text-vox-text hover:bg-vox-surface transition-all duration-200 text-sm"
                title={t.common.language}
                aria-label={t.common.language}
            >
                <Globe size={18} />
                <span className="font-medium">{current.short}</span>
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 w-40 py-1 bg-vox-surface-high border border-vox-outline/20 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl z-50">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                setLanguage(lang.code);
                                setOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                language === lang.code
                                    ? "text-vox-primary bg-vox-primary/5"
                                    : "text-vox-text hover:bg-vox-surface-highest"
                            }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
