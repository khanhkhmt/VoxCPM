"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import en from "./locales/en";
import vi from "./locales/vi";
import type { Translations } from "./locales/en";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Language = "en" | "vi";

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
}

// ---------------------------------------------------------------------------
// Locale map
// ---------------------------------------------------------------------------
const locales: Record<Language, Translations> = { en, vi };

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------
const STORAGE_KEY = "oriagent_language";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const I18nContext = createContext<I18nContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window === "undefined") return "en";
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === "en" || saved === "vi") return saved;
        } catch {
            // localStorage unavailable
        }
        return "en";
    });

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch {
            // localStorage unavailable
        }
    }, []);

    const t = locales[language];

    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useI18n() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error("useI18n must be used within an I18nProvider");
    }
    return context;
}
