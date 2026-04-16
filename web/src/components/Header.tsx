"use client";

import Link from "next/link";
import { LogIn, LogOut, User, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Header() {
    const { user, isLoggedIn, login, logout } = useAuth();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg bg-vox-primary flex items-center justify-center glow-primary">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.8" />
                                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-vox-text to-vox-text-dim transition-colors group-hover:from-white group-hover:to-vox-text">
                                Voxora
                            </span>
                        </Link>
                    </div>

                    <nav className="hidden md:block">
                        <ul className="flex space-x-8">
                            <li><Link href="#features" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Features</Link></li>
                            <li><Link href="#pricing" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Pricing</Link></li>
                            <li><Link href="#docs" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Docs</Link></li>
                        </ul>
                    </nav>

                    <div className="flex items-center gap-4">
                        {isLoggedIn && user ? (
                            <div className="flex items-center gap-4">
                                <Link
                                    href="/studio"
                                    className="hidden md:inline-flex px-4 py-2 text-sm font-medium rounded-lg text-vox-bg bg-vox-secondary hover:bg-vox-secondary/90 transition-all duration-300 shadow-[0_0_15px_rgba(76,215,246,0.3)]"
                                >
                                    Go to Studio
                                </Link>
                                <div className="relative group">
                                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-vox-surface transition-colors border border-transparent hover:border-white/5">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={user.avatar} alt="Avatar" className="w-7 h-7 rounded-full bg-vox-surface-high ring-1 ring-vox-outline/50" />
                                        <span className="text-sm font-medium hidden sm:block">{user.name}</span>
                                    </button>
                                    <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-vox-surface-high border border-vox-outline/20 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 backdrop-blur-xl">
                                        <Link href="/studio" className="flex items-center gap-2 px-4 py-2 text-sm text-vox-text hover:bg-vox-surface-highest transition-colors">
                                            <User size={16} className="text-vox-secondary" /> Studio
                                        </Link>
                                        <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-vox-surface-highest transition-colors">
                                            <LogOut size={16} /> Sign out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={login}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-transparent border border-vox-outline hover:border-vox-primary hover:bg-vox-surface-high transition-all duration-300 group"
                            >
                                <LogIn size={16} className="text-vox-primary group-hover:text-vox-secondary transition-colors" />
                                <span className="hidden sm:inline">Sign in with Google</span>
                                <span className="sm:hidden">Sign in</span>
                            </button>
                        )}

                        <button className="md:hidden text-vox-text-dim hover:text-vox-text p-2">
                            <Menu size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
