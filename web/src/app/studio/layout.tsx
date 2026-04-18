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
        // but as a fallback client-side check, we can push to login if unauthenticated.
        if (status === "unauthenticated") {
            router.push("/login?next=/studio");
        }
    }, [status, router]);

    // Don't render studio content until fully authenticated 
    // to prevent flash of content before redirect
    if (status !== "authenticated") return null;

    return (
        <div className="flex h-screen bg-vox-bg overflow-hidden relative">
            <Sidebar />
            <div className="flex-1 flex flex-col h-full bg-vox-bg overflow-y-auto">
                <div className="h-16 flex items-center justify-between px-8 border-b border-vox-outline/10 bg-vox-bg/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-vox-text-dim">Studio</span>
                        <span className="text-vox-text-dim">/</span>
                        <span className="text-white font-medium">New Synthesis</span>
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
