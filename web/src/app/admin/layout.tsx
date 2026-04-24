"use client";

import AdminGuard from "@/components/admin/AdminGuard";
import AdminSidebar from "@/components/admin/AdminSidebar";

// ---------------------------------------------------------------------------
// Admin Layout — Wraps all /admin/* pages with sidebar + role guard
// Completely isolated from studio layout.
// ---------------------------------------------------------------------------
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminGuard>
            <div className="flex h-screen bg-vox-bg overflow-hidden">
                <AdminSidebar />
                <div className="flex-1 flex flex-col h-full overflow-y-auto">
                    {/* Top bar */}
                    <div className="h-16 flex items-center justify-between px-8 border-b border-vox-outline/10 bg-vox-bg/80 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-vox-text-dim">Admin</span>
                            <span className="text-vox-text-dim">/</span>
                            <span className="text-vox-heading font-medium">Management</span>
                        </div>
                    </div>

                    {/* Page content */}
                    <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
                        {children}
                    </main>
                </div>
            </div>
        </AdminGuard>
    );
}
