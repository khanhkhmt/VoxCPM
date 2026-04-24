"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import UserTable, { type AdminUser } from "@/components/admin/UserTable";

// ---------------------------------------------------------------------------
// /admin/users — User management page
// ---------------------------------------------------------------------------
export default function AdminUsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const fetchUsers = useCallback(async (p: number, q: string) => {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams({ page: String(p), pageSize: "20" });
            if (q) params.set("q", q);
            const res = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error?.message || "Failed to load users");
            setUsers(json.data.items);
            setTotalPages(json.data.totalPages);
            setTotal(json.data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load + page change
    useEffect(() => { fetchUsers(page, searchQuery); }, [page, fetchUsers, searchQuery]);

    // Debounced search
    const handleSearchChange = useCallback((q: string) => {
        setSearchQuery(q);
        setPage(1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchUsers(1, q), 400);
    }, [fetchUsers]);

    const handleUserUpdated = useCallback(() => {
        fetchUsers(page, searchQuery);
    }, [fetchUsers, page, searchQuery]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-vox-heading tracking-tight">User Management</h1>
                <p className="text-sm text-vox-text-dim mt-1">Manage users, roles, and account status.</p>
            </div>

            {error && (
                <div className="glass-panel rounded-2xl p-4 text-center text-red-400 text-sm">{error}</div>
            )}

            {loading && users.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-vox-primary/30 border-t-vox-primary rounded-full animate-spin" />
                </div>
            ) : (
                <UserTable
                    users={users}
                    currentAdminId={currentUser?.id || ""}
                    onUserUpdated={handleUserUpdated}
                    searchQuery={searchQuery}
                    onSearchChange={handleSearchChange}
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
}
