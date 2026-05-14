"use client";

import Link from "next/link";
import { LogIn, LogOut, User, Menu, Sun, Moon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/i18n";
import Logo from "@/components/Logo";
import LanguageSelector from "@/components/LanguageSelector";

export default function Header() {
    const { user, isLoggedIn, logout, status } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { t } = useI18n();

    // Prevent hydration mismatch by not rendering auth buttons until status is known
    const isAuthReady = status !== "loading";

    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <Logo />
                    </div>

                    <nav className="hidden md:block">
                        <ul className="flex space-x-8">
                            <li><Link href="#features" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.nav.features}</Link></li>
                            <li><Link href="#pricing" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.nav.pricing}</Link></li>
                            <li><Link href="#docs" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.nav.docs}</Link></li>
                        </ul>
                    </nav>

                    <div className="flex items-center gap-4">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-vox-text-dim hover:text-vox-text hover:bg-vox-surface transition-all duration-200"
                            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            aria-label="Toggle theme"
                        >
                            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* Language Selector */}
                        <LanguageSelector variant="compact" />

                        {isLoggedIn && user ? (
                            <div className="flex items-center gap-4">
                                <Link
                                    href="/studio"
                                    className="hidden md:inline-flex px-4 py-2 text-sm font-medium rounded-lg text-vox-bg bg-vox-secondary hover:bg-vox-secondary/90 transition-all duration-300 shadow-[0_0_15px_rgba(76,215,246,0.3)]"
                                >
                                    {t.common.goToStudio}
                                </Link>
                                <div className="relative group">
                                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-vox-surface transition-colors border border-transparent hover:border-white/5">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={user.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${user.username}`}
                                            alt="Avatar"
                                            className="w-7 h-7 rounded-full bg-vox-surface-high ring-1 ring-vox-outline/50"
                                        />
                                        <span className="text-sm font-medium hidden sm:block">{user.name}</span>
                                    </button>
                                    <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-vox-surface-high border border-vox-outline/20 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 backdrop-blur-xl">
                                        <Link href="/studio" className="flex items-center gap-2 px-4 py-2 text-sm text-vox-text hover:bg-vox-surface-highest transition-colors">
                                            <User size={16} className="text-vox-secondary" /> Studio
                                        </Link>
                                        <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-vox-surface-highest transition-colors">
                                            <LogOut size={16} /> {t.common.signOut}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : isAuthReady ? (
                            <div className="flex items-center gap-3">
                                <Link
                                    href="/login"
                                    className="px-4 py-2 text-sm font-medium text-vox-text-dim hover:text-vox-heading transition-colors"
                                >
                                    {t.common.signIn}
                                </Link>
                                <Link
                                    href="/register"
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-vox-heading bg-transparent border border-vox-outline hover:border-vox-primary hover:bg-vox-surface-high transition-all duration-300"
                                >
                                    <span className="hidden sm:inline">{t.common.signUp}</span>
                                    <span className="sm:hidden">{t.common.join}</span>
                                </Link>
                            </div>
                        ) : null}

                        <button className="md:hidden text-vox-text-dim hover:text-vox-text p-2 ml-2">
                            <Menu size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
