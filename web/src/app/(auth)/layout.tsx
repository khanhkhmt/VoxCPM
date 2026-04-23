"use client";

import Logo from "@/components/Logo";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen flex flex-col bg-vox-bg relative overflow-hidden">
            {/* Background ambient lights */}
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-vox-primary/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-vox-secondary/5 blur-[100px] pointer-events-none" />

            {/* Simple header */}
            <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6">
                <Logo />
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg text-vox-text-dim hover:text-vox-text hover:bg-vox-surface transition-all duration-200"
                    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    aria-label="Toggle theme"
                >
                    {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </header>

            {/* Centered content */}
            <main className="flex-1 flex items-center justify-center px-4 pt-16 pb-8">
                {children}
            </main>

            {/* Minimal footer */}
            <footer className="text-center py-4 text-xs text-vox-text-dim">
                &copy; {new Date().getFullYear()} Oriagent. All rights reserved.
            </footer>
        </div>
    );
}
