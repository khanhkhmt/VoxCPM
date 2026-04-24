"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// ---------------------------------------------------------------------------
// AdminGuard — Client-side role check (redirects non-admin to /studio)
// Server-side protection is handled by requireAdmin() in API routes.
// This component provides immediate UX feedback on the client.
// ---------------------------------------------------------------------------
export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, status } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated" && user?.role !== "admin") {
            router.replace("/studio");
        }
    }, [status, user, router]);

    // Loading state
    if (status === "loading") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-vox-bg gap-4">
                <div className="w-10 h-10 border-4 border-vox-primary/30 border-t-vox-primary rounded-full animate-spin" />
                <p className="text-vox-text-dim text-sm font-medium animate-pulse">
                    Đang xác thực quyền truy cập...
                </p>
            </div>
        );
    }

    // Unauthenticated — middleware handles redirect, but show fallback
    if (status === "unauthenticated") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-vox-bg gap-4">
                <p className="text-vox-text-dim text-sm">Đang chuyển hướng đến đăng nhập...</p>
            </div>
        );
    }

    // Not admin — show message while redirecting
    if (user?.role !== "admin") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-vox-bg gap-4">
                <div className="glass-panel rounded-2xl p-8 text-center max-w-sm">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    </div>
                    <h2 className="text-vox-heading font-semibold mb-2">Không có quyền truy cập</h2>
                    <p className="text-vox-text-dim text-sm">Trang này chỉ dành cho quản trị viên.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
