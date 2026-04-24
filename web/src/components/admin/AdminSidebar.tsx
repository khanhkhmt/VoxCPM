"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useState, useEffect, useCallback } from "react";
import {
    BarChart3,
    Users,
    History,
    ArrowLeft,
    Sun,
    Moon,
    LogOut,
    Shield,
} from "lucide-react";

// ---------------------------------------------------------------------------
// AdminSidebar — Isolated sidebar for admin panel (does NOT touch studio Sidebar)
// Theme toggle is self-contained — no dependency on @/lib/theme
// ---------------------------------------------------------------------------
const NAV_LINKS = [
    { name: "Dashboard", href: "/admin", icon: BarChart3 },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "TTS History", href: "/admin/history", icon: History },
] as const;

function useLocalTheme() {
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        const isDark = !document.documentElement.classList.contains("light");
        setTheme(isDark ? "dark" : "light");
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next = prev === "dark" ? "light" : "dark";
            const root = document.documentElement;
            if (next === "light") {
                root.classList.add("light");
                root.classList.remove("dark");
            } else {
                root.classList.add("dark");
                root.classList.remove("light");
            }
            localStorage.setItem("vox-theme", next);
            return next;
        });
    }, []);

    return { theme, toggleTheme };
}

export default function AdminSidebar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useLocalTheme();
    const pathname = usePathname();

    return (
        <div className="h-screen w-64 flex flex-col bg-vox-surface-low border-r border-vox-outline/20">
            {/* Header */}
            <div className="h-20 flex items-center px-5 border-b border-vox-outline/20">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vox-primary to-vox-secondary flex items-center justify-center">
                        <Shield size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-vox-heading tracking-tight">Admin Panel</p>
                        <p className="text-[10px] text-vox-text-dim uppercase tracking-widest">VoxCPM Studio</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                    const isActive =
                        link.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(link.href);

                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group
                                ${isActive
                                    ? "bg-vox-primary/10 text-vox-heading"
                                    : "text-vox-text-dim hover:bg-vox-surface hover:text-vox-heading"
                                }`}
                        >
                            <link.icon
                                size={20}
                                className={
                                    isActive
                                        ? "text-vox-primary"
                                        : "text-vox-text-dim group-hover:text-vox-secondary"
                                }
                            />
                            <span className="font-medium text-sm">{link.name}</span>
                        </Link>
                    );
                })}

                {/* Divider */}
                <div className="my-4 border-t border-vox-outline/15" />

                {/* Back to Studio */}
                <Link
                    href="/studio"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-vox-text-dim hover:bg-vox-surface hover:text-vox-heading transition-colors group"
                >
                    <ArrowLeft size={20} className="text-vox-text-dim group-hover:text-vox-secondary" />
                    <span className="font-medium text-sm">Back to Studio</span>
                </Link>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-vox-outline/20">
                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-3 py-2 mb-3 text-sm text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface rounded-lg transition-colors"
                    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>

                {/* User info */}
                <div className="flex items-center gap-3 bg-vox-surface rounded-xl p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={user?.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${user?.username}`}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full bg-vox-surface-high border border-vox-outline/20"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-vox-heading truncate">{user?.name}</p>
                        <p className="text-[10px] font-semibold text-vox-primary uppercase tracking-wide">Admin</p>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={logout}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-vox-text-dim hover:text-red-400 hover:bg-vox-surface-highest rounded-lg transition-colors"
                >
                    <LogOut size={16} /> Sign out
                </button>
            </div>
        </div>
    );
}
