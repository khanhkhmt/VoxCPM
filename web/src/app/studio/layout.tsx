"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/studio/Sidebar";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
    const { status } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Redirection should primarily be handled by middleware.ts,
        // but as a fallback client-side check, redirect to login if unauthenticated.
        // Using replace() so the user can't press "Back" to return to
        // the broken studio page.
        if (status === "unauthenticated") {
            router.replace("/login?next=/studio");
        }
    }, [status, router]);

    // --- Loading: show spinner instead of black screen ---
    if (status === "loading") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-vox-bg gap-4">
                <div className="w-10 h-10 border-4 border-vox-primary/30 border-t-vox-primary rounded-full animate-spin" />
                <p className="text-vox-text-dim text-sm font-medium animate-pulse">
                    Đang xác thực phiên...
                </p>
            </div>
        );
    }

    // --- Unauthenticated: show message while redirecting ---
    if (status === "unauthenticated") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-vox-bg gap-4">
                <div className="glass-panel rounded-2xl p-8 text-center max-w-sm">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-vox-heading font-semibold mb-2">
                        Phiên đăng nhập không còn hợp lệ
                    </h2>
                    <p className="text-vox-text-dim text-sm mb-4">
                        Vui lòng đăng nhập lại để tiếp tục.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-vox-secondary text-sm">
                        <div className="w-4 h-4 border-2 border-vox-secondary/30 border-t-vox-secondary rounded-full animate-spin" />
                        Đang chuyển hướng...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-vox-bg overflow-hidden relative">
            <Sidebar />
            <div className="flex-1 flex flex-col h-full bg-vox-bg overflow-y-auto">
                <div className="h-16 flex items-center justify-between px-8 border-b border-vox-outline/10 bg-vox-bg/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-vox-text-dim">Studio</span>
                        <span className="text-vox-text-dim">/</span>
                        <span className="text-vox-heading font-medium">New Synthesis</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1 rounded-full bg-vox-surface text-xs font-mono text-vox-secondary border border-vox-secondary/20">
                            Quota: 142 / 500 chars (Mock)
                        </div>
                    </div>
                </div>

                <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}

