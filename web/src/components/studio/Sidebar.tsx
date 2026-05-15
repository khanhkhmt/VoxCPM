"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/i18n";
import {
    LayoutDashboard,
    Mic,
    History,
    Settings,
    LogOut,
    Sun,
    Moon,
    Layers,
    ChevronDown,
    Code2,
    TerminalSquare,
    BookOpen,
    MoreHorizontal,
    PanelLeftClose,
    PanelLeft,
} from "lucide-react";
import { useState } from "react";

const API_PLATFORM_PATHS = [
    "/studio/developer",
    "/studio/playground",
    "/studio/api-docs",
];

/**
 * Studio sidebar — Oriagent design.
 *
 * Fixed-width (220px) when expanded, collapsed mode shows icon-only rail.
 * Sections:
 *   1. Brand logo (top, with bottom border)
 *   2. Nav links (Studio, Voice Library, API Platform group, History)
 *   3. Theme toggle + Settings
 *   4. User card + Sign out (bottom, with top border)
 *
 * Preserves all existing routes / auth / theme / i18n bindings — only the
 * visual treatment has changed.
 */
export default function Sidebar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { t } = useI18n();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const isApiPlatformActive = API_PLATFORM_PATHS.some((p) =>
        pathname.startsWith(p),
    );
    const [apiOpen, setApiOpen] = useState(isApiPlatformActive);

    const isActive = (href: string) => pathname === href;

    const apiSubLinks = [
        { name: t.sidebar.apiConsole, href: "/studio/developer", icon: Code2 },
        { name: t.sidebar.playground, href: "/studio/playground", icon: TerminalSquare },
        { name: t.sidebar.apiDocs, href: "/studio/api-docs", icon: BookOpen },
    ];

    const navItemCls = (active: boolean) =>
        `flex items-center ${collapsed ? "justify-center" : "gap-[9px]"} px-2 py-[7px] rounded-md text-[13px] cursor-pointer transition-colors select-none ${
            active
                ? "bg-vox-surface-high text-vox-text font-medium"
                : "text-vox-text-dim hover:bg-vox-surface-high hover:text-vox-text"
        }`;

    return (
        <aside
            className={`shrink-0 flex flex-col h-screen bg-vox-surface border-r border-vox-outline/40 overflow-hidden transition-[width] duration-200 ${
                collapsed ? "w-[68px]" : "w-[220px]"
            }`}
        >
            {/* ── Top: brand ── */}
            <div className="px-4 pt-[18px] pb-3 border-b border-vox-outline/40 flex items-center justify-between gap-2">
                <Link
                    href="/studio"
                    className="flex items-center gap-2 text-[16px] font-bold text-vox-heading no-underline"
                >
                    <span
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: "var(--ori-text)" }}
                    >
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                            <path
                                d="M3 8a5 5 0 1 0 10 0c0-2.76-2.24-5-5-5"
                                stroke="#fff"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                            />
                            <circle cx="8" cy="8" r="1.6" fill="#fff" />
                        </svg>
                    </span>
                    {!collapsed && <span>Oriagent</span>}
                </Link>
                <button
                    type="button"
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:inline-flex p-1.5 rounded-md text-vox-text-dim hover:text-vox-text hover:bg-vox-surface-high transition-colors"
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
                </button>
            </div>

            {/* ── Nav ── */}
            <nav className="flex-1 px-[10px] py-[10px] overflow-y-auto">
                <div className="flex flex-col mb-1">
                    <Link href="/studio" className={navItemCls(isActive("/studio"))}>
                        <LayoutDashboard size={14} strokeWidth={1.7} />
                        {!collapsed && <span>{t.sidebar.studio}</span>}
                    </Link>
                    <Link
                        href="/studio/voices"
                        className={navItemCls(pathname.startsWith("/studio/voices"))}
                    >
                        <Mic size={14} strokeWidth={1.7} />
                        {!collapsed && <span>{t.sidebar.voiceLibrary}</span>}
                    </Link>

                    {/* API Platform group */}
                    {collapsed ? (
                        apiSubLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={navItemCls(isActive(link.href))}
                                title={link.name}
                            >
                                <link.icon size={14} strokeWidth={1.7} />
                            </Link>
                        ))
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setApiOpen(!apiOpen)}
                                className={`flex items-center gap-[9px] w-full px-2 py-[7px] rounded-md text-[13px] cursor-pointer transition-colors text-left ${
                                    isApiPlatformActive
                                        ? "bg-vox-surface-high text-vox-text font-medium"
                                        : "text-vox-text-dim hover:bg-vox-surface-high hover:text-vox-text"
                                }`}
                            >
                                <Layers size={14} strokeWidth={1.7} />
                                <span className="flex-1">{t.sidebar.apiPlatform}</span>
                                <ChevronDown
                                    size={12}
                                    className={`transition-transform ${
                                        apiOpen ? "rotate-0" : "-rotate-90"
                                    }`}
                                />
                            </button>
                            {apiOpen && (
                                <div className="ml-3 pl-3 border-l border-vox-outline/40 flex flex-col">
                                    {apiSubLinks.map((link) => (
                                        <Link
                                            key={link.name}
                                            href={link.href}
                                            className={navItemCls(isActive(link.href))}
                                        >
                                            <link.icon size={13} strokeWidth={1.7} />
                                            <span>{link.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    <Link
                        href="/studio/history"
                        className={navItemCls(isActive("/studio/history"))}
                    >
                        <History size={14} strokeWidth={1.7} />
                        {!collapsed && <span>{t.sidebar.history}</span>}
                    </Link>
                </div>

                {/* Divider */}
                <div className="h-px bg-vox-outline/40 my-[6px] mx-[2px]" />

                <div className="flex flex-col">
                    {/* Theme toggle */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className={navItemCls(false) + " w-full text-left"}
                        title={theme === "dark" ? t.sidebar.lightMode : t.sidebar.darkMode}
                    >
                        {theme === "dark" ? (
                            <Sun size={14} strokeWidth={1.7} />
                        ) : (
                            <Moon size={14} strokeWidth={1.7} />
                        )}
                        {!collapsed && (
                            <span>
                                {theme === "dark" ? t.sidebar.lightMode : t.sidebar.darkMode}
                            </span>
                        )}
                    </button>

                    <Link
                        href="/studio/settings"
                        className={navItemCls(isActive("/studio/settings"))}
                    >
                        <Settings size={14} strokeWidth={1.7} />
                        {!collapsed && <span>{t.sidebar.settings}</span>}
                    </Link>
                </div>
            </nav>

            {/* ── User block ── */}
            <div className="px-[10px] py-3 border-t border-vox-outline/40 shrink-0">
                <Link
                    href="/studio/settings"
                    className={`flex items-center ${collapsed ? "justify-center" : "gap-[9px]"} p-2 rounded-md hover:bg-vox-surface-high transition-colors cursor-pointer no-underline`}
                    title={user?.name ?? user?.username ?? ""}
                >
                    <UserAvatar name={user?.name ?? user?.username ?? "?"} avatarUrl={user?.avatarUrl ?? undefined} />
                    {!collapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] font-semibold text-vox-text truncate">
                                    {user?.name ?? user?.username}
                                </p>
                                <p className="text-[11px] text-vox-text-dim truncate">
                                    {user?.username ?? ""}
                                </p>
                            </div>
                            <MoreHorizontal size={12} className="text-vox-text-dim/70 shrink-0" />
                        </>
                    )}
                </Link>

                <button
                    type="button"
                    onClick={logout}
                    className={`mt-0.5 w-full flex items-center ${collapsed ? "justify-center" : "gap-2"} px-2 py-[7px] rounded-md text-[12.5px] text-red-500 hover:bg-red-500/10 transition-colors`}
                    title={t.sidebar.signOut}
                >
                    <LogOut size={13} strokeWidth={1.8} />
                    {!collapsed && <span>{t.sidebar.signOut}</span>}
                </button>
            </div>
        </aside>
    );
}

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
    const initial = (name?.[0] ?? "?").toUpperCase();
    if (avatarUrl) {
        return (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
                src={avatarUrl}
                alt={`Avatar of ${name}`}
                className="w-8 h-8 rounded-full bg-vox-surface-high border border-vox-outline/40 shrink-0 object-cover"
            />
        );
    }
    return (
        <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            aria-label={`Avatar of ${name}`}
        >
            {initial}
        </div>
    );
}
