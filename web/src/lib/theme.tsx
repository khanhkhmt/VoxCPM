"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Theme = "dark" | "light";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark");
    const [mounted, setMounted] = useState(false);

    // On mount, read saved preference (the inline script already set the class)
    useEffect(() => {
        const saved = localStorage.getItem("vox-theme") as Theme | null;
        if (saved === "light" || saved === "dark") {
            setTheme(saved);
        } else {
            // Check system preference
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setTheme(prefersDark ? "dark" : "light");
        }
        setMounted(true);
    }, []);

    // Sync class + localStorage whenever theme changes
    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;
        if (theme === "light") {
            root.classList.add("light");
            root.classList.remove("dark");
        } else {
            root.classList.add("dark");
            root.classList.remove("light");
        }
        localStorage.setItem("vox-theme", theme);
    }, [theme, mounted]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
