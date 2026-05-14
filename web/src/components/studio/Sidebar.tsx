"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/i18n";
import {
    Mic, LayoutDashboard, History, Settings, PanelLeftClose, PanelLeft,
    LogOut, Sun, Moon, Code2, TerminalSquare, BookOpen, ChevronDown, Layers,
} from "lucide-react";
import { useState } from "react";
import Logo from "@/components/Logo";

const API_PLATFORM_PATHS = ["/studio/developer", "/studio/playground", "/studio/api-docs"];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { t } = useI18n();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const isApiPlatformActive = API_PLATFORM_PATHS.some(p => pathname.startsWith(p));
    const [apiOpen, setApiOpen] = useState(isApiPlatformActive);

    const isActive = (href: string) => pathname === href;

    const linkCls = (href: string) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
            isActive(href) ? "bg-vox-primary/10 text-vox-heading" : "text-vox-text-dim hover:bg-vox-surface hover:text-vox-heading"
        }`;

    const iconCls = (href: string) =>
        isActive(href) ? "text-vox-primary" : "text-vox-text-dim group-hover:text-vox-secondary";

    const apiSubLinks = [
        { name: t.sidebar.apiConsole, href: "/studio/developer", icon: Code2 },
        { name: t.sidebar.playground, href: "/studio/playground", icon: TerminalSquare },
        { name: t.sidebar.apiDocs, href: "/studio/api-docs", icon: BookOpen },
    ];

    return (
        <div className={`h-screen flex flex-col bg-vox-surface-low border-r border-vox-outline/20 transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
            {/* Logo */}
            <div className="h-20 flex items-center justify-between px-4 border-b border-vox-outline/20">
                <div className="px-2 w-full flex justify-center md:block pt-1">
                    <Logo iconOnly={collapsed} />
                </div>
                <button onClick={() => setCollapsed(!collapsed)} className="text-vox-text-dim hover:text-vox-heading p-1 rounded-md absolute -right-3 top-6 bg-vox-surface border border-vox-outline/30 z-10 hidden md:block">
                    {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
                {/* Studio */}
                <Link href="/studio" className={linkCls("/studio")}>
                    <LayoutDashboard size={20} className={iconCls("/studio")} />
                    {!collapsed && <span className="font-medium text-sm">{t.sidebar.studio}</span>}
                </Link>

                {/* Voice Library */}
                <Link href="/studio/voices" className={linkCls("/studio/voices")}>
                    <Mic size={20} className={iconCls("/studio/voices")} />
                    {!collapsed && <span className="font-medium text-sm">{t.sidebar.voiceLibrary}</span>}
                </Link>

                {/* Divider */}
                {!collapsed && <div className="h-px bg-vox-outline/15 my-2 mx-2" />}
                {collapsed && <div className="h-px bg-vox-outline/15 my-2" />}

                {/* API Platform Group */}
                {collapsed ? (
                    /* Collapsed: just show icons for sub-links */
                    apiSubLinks.map(link => (
                        <Link key={link.name} href={link.href} className={linkCls(link.href)} title={link.name}>
                            <link.icon size={20} className={iconCls(link.href)} />
                        </Link>
                    ))
                ) : (
                    <>
                        <button
                            onClick={() => setApiOpen(!apiOpen)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full group ${
                                isApiPlatformActive ? "text-vox-heading" : "text-vox-text-dim hover:bg-vox-surface hover:text-vox-heading"
                            }`}
                        >
                            <Layers size={20} className={isApiPlatformActive ? "text-vox-primary" : "text-vox-text-dim group-hover:text-vox-secondary"} />
                            <span className="font-medium text-sm flex-1 text-left">{t.sidebar.apiPlatform}</span>
                            <ChevronDown size={14} className={`text-vox-text-dim transition-transform duration-200 ${apiOpen ? "rotate-0" : "-rotate-90"}`} />
                        </button>
                        {apiOpen && (
                            <div className="ml-5 pl-3 border-l border-vox-outline/15 flex flex-col gap-0.5">
                                {apiSubLinks.map(link => (
                                    <Link key={link.name} href={link.href}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group text-sm ${
                                            isActive(link.href) ? "bg-vox-primary/10 text-vox-heading font-medium" : "text-vox-text-dim hover:bg-vox-surface hover:text-vox-heading"
                                        }`}>
                                        <link.icon size={16} className={iconCls(link.href)} />
                                        <span>{link.name}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Divider */}
                {!collapsed && <div className="h-px bg-vox-outline/15 my-2 mx-2" />}
                {collapsed && <div className="h-px bg-vox-outline/15 my-2" />}

                {/* History */}
                <Link href="/studio/history" className={linkCls("/studio/history")}>
                    <History size={20} className={iconCls("/studio/history")} />
                    {!collapsed && <span className="font-medium text-sm">{t.sidebar.history}</span>}
                </Link>
            </div>

            {/* Bottom: User area */}
            <div className="p-3 border-t border-vox-outline/20 space-y-2">
                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2 text-sm text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface rounded-lg transition-colors`}
                    title={theme === "dark" ? t.sidebar.lightMode : t.sidebar.darkMode}
                >
                    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    {!collapsed && <span>{theme === "dark" ? t.sidebar.lightMode : t.sidebar.darkMode}</span>}
                </button>

                {/* Settings */}
                <Link href="/studio/settings"
                    className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive("/studio/settings") ? "bg-vox-primary/10 text-vox-heading" : "text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface"
                    }`}>
                    <Settings size={18} className={isActive("/studio/settings") ? "text-vox-primary" : ""} />
                    {!collapsed && <span>{t.sidebar.settings}</span>}
                </Link>

                {/* User Profile Card */}
                <Link href="/studio/settings"
                    className="flex items-center gap-3 bg-vox-surface hover:bg-vox-surface-high rounded-xl p-2.5 transition-colors cursor-pointer group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={user?.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${user?.username}`}
                        alt="Avatar"
                        className="w-9 h-9 rounded-full bg-vox-surface-high border border-vox-outline/20 flex-shrink-0"
                    />
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-vox-heading truncate">{user?.name}</p>
                            <p className="text-xs text-vox-text-dim truncate">{user?.username}</p>
                        </div>
                    )}
                </Link>

                {/* Sign out */}
                {!collapsed && (
                    <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-vox-text-dim hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors">
                        <LogOut size={16} /> {t.sidebar.signOut}
                    </button>
                )}
            </div>
        </div>
    );
}
