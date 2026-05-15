"use client";

import { useI18n, type Language } from "@/i18n";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface LanguageSelectorProps {
    variant?: "compact" | "full";
}

export default function LanguageSelector({ variant = "compact" }: LanguageSelectorProps) {
    const { language, setLanguage, t } = useI18n();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const LANGUAGES: { code: Language; label: string; short: string }[] = [
        { code: "en", label: t.common.english, short: "EN" },
        { code: "vi", label: t.common.vietnamese, short: "VI" },
    ];

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const current = LANGUAGES.find((l) => l.code === language)!;

    if (variant === "full") {
        return (
            <div className="relative w-full sm:max-w-xs" ref={ref}>
                <button
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-vox-surface-low border border-vox-outline/20 rounded-xl text-sm text-vox-heading hover:bg-vox-surface transition-colors focus:border-vox-primary focus:outline-none"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                >
                    <div className="flex items-center gap-2">
                        <Globe size={16} className="text-vox-text-dim" />
                        <span>{current.label}</span>
                    </div>
                    <ChevronDown size={16} className="text-vox-text-dim" />
                </button>
                {open && (
                    <div className="absolute left-0 top-full mt-1 w-full py-1 bg-vox-surface-high border border-vox-outline/20 rounded-xl shadow-lg backdrop-blur-xl z-50 overflow-hidden">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLanguage(lang.code);
                                    setOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                    language === lang.code
                                        ? "bg-vox-primary/10 text-vox-primary"
                                        : "text-vox-text hover:bg-vox-surface-highest"
                                }`}
                                role="option"
                                aria-selected={language === lang.code}
                            >
                                <div className="flex items-center gap-2">
                                    <Globe size={16} className={language === lang.code ? "text-vox-primary" : "text-vox-text-dim"} />
                                    {lang.label}
                                </div>
                                {language === lang.code && <Check size={16} />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Compact dropdown for navbar
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
