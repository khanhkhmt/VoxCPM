"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/studio/Sidebar";
import { useI18n } from "@/i18n";

/**
 * Studio shell layout — Oriagent design.
 *   - Left: persistent Sidebar (220px).
 *   - Right: Topbar (52px, breadcrumb + quota pill) + scrollable content area.
 *
 * Auth / loading / redirect behaviour is identical to the previous shell.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
    const { status } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useI18n();

    const breadcrumbMap: Record<string, string> = {
        "/studio": t.studio.newSynthesis.title,
        "/studio/voices": t.sidebar.voiceLibrary,
        "/studio/developer": t.sidebar.apiConsole,
        "/studio/playground": t.sidebar.playground,
        "/studio/api-docs": t.sidebar.apiDocs,
        "/studio/history": t.sidebar.history,
        "/studio/settings": t.sidebar.settings,
    };
    const currentPage = breadcrumbMap[pathname] || t.studio.newSynthesis.title;

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login?next=/studio");
        }
    }, [status, router]);

    // --- Loading state ---
    if (status === "loading") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-vox-bg gap-4">
                <div className="w-10 h-10 border-[3px] border-vox-outline/40 border-t-vox-text rounded-full animate-spin" />
                <p className="text-vox-text-dim text-sm font-medium animate-pulse">
                    Đang xác thực phiên...
                </p>
            </div>
        );
    }

    // --- Unauthenticated state (briefly visible while redirect runs) ---
    if (status === "unauthenticated") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-vox-bg gap-4">
                <div className="bg-vox-surface border border-vox-outline/60 rounded-2xl p-8 text-center max-w-sm">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <svg
                            className="w-6 h-6 text-red-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-vox-heading font-semibold mb-2">
                        Phiên đăng nhập không còn hợp lệ
                    </h2>
                    <p className="text-vox-text-dim text-sm mb-4">
                        Vui lòng đăng nhập lại để tiếp tục.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-vox-text-dim text-sm">
                        <div className="w-4 h-4 border-2 border-vox-outline/40 border-t-vox-text rounded-full animate-spin" />
                        Đang chuyển hướng...
                    </div>
                </div>
            </div>
        );
    }

    // Mock quota — visual only, matches the design mockup.
    const quotaUsed = 142;
    const quotaTotal = 500;
    const quotaPct = Math.min(100, (quotaUsed / quotaTotal) * 100);

    return (
        <div className="flex h-screen bg-vox-bg overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="h-[52px] flex items-center justify-between px-7 bg-vox-surface border-b border-vox-outline/40 shrink-0 gap-3">
                    <nav
                        className="flex items-center gap-1.5 text-[13px] text-vox-text-dim min-w-0"
                        aria-label="Breadcrumb"
                    >
                        <span className="hover:text-vox-text transition-colors truncate">
                            Studio
                        </span>
                        <span className="text-vox-text-dim/60 text-[11px]">/</span>
                        <span className="text-vox-text font-medium truncate">
                            {currentPage}
                        </span>
                    </nav>
                    <div className="flex items-center gap-2 bg-vox-surface-high border border-vox-outline/60 rounded-full px-3 py-[5px] text-[11.5px] text-vox-text-dim">
                        <div className="w-20 h-1 bg-vox-outline/60 rounded-sm overflow-hidden">
                            <div
                                className="h-full rounded-sm bg-ori-blue"
                                style={{ width: `${quotaPct}%` }}
                            />
                        </div>
                        <span className="font-medium">
                            {quotaUsed} / {quotaTotal} chars
                        </span>
                        <span className="text-[10px] text-vox-text-dim/70 bg-vox-surface-highest rounded px-1.5 py-px">
                            Mock
                        </span>
                    </div>
                </header>

                {/* Content area */}
                <main className="flex-1 overflow-y-auto px-7 py-7 pb-10">
                    <div className="max-w-7xl mx-auto w-full">{children}</div>
                </main>
            </div>
        </div>
    );
}
