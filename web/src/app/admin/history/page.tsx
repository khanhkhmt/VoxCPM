"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AdminHistoryList, { type AdminHistoryItem } from "@/components/admin/AdminHistoryList";

// ---------------------------------------------------------------------------
// /admin/history — System-wide TTS history page
// ---------------------------------------------------------------------------
export default function AdminHistoryPage() {
    const [items, setItems] = useState<AdminHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterUserId, setFilterUserId] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchHistory = useCallback(async (p: number, q: string, uid: string) => {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams({ page: String(p), pageSize: "20" });
            if (q) params.set("q", q);
            if (uid) params.set("userId", uid);
            const res = await fetch(`/api/admin/history?${params}`, { credentials: "include" });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error?.message || "Failed to load history");
            setItems(json.data.items);
            setTotalPages(json.data.totalPages);
            setTotal(json.data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchHistory(page, searchQuery, filterUserId); }, [page, fetchHistory, searchQuery, filterUserId]);

    const handleSearchChange = useCallback((q: string) => {
        setSearchQuery(q);
        setPage(1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchHistory(1, q, filterUserId), 400);
    }, [fetchHistory, filterUserId]);

    const handleFilterUserChange = useCallback((uid: string) => {
        setFilterUserId(uid);
        setPage(1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchHistory(1, searchQuery, uid), 400);
    }, [fetchHistory, searchQuery]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-vox-heading tracking-tight">TTS History</h1>
                <p className="text-sm text-vox-text-dim mt-1">View all text-to-speech generations across all users.</p>
            </div>

            {error && (
                <div className="glass-panel rounded-2xl p-4 text-center text-red-400 text-sm">{error}</div>
            )}

            {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-vox-primary/30 border-t-vox-primary rounded-full animate-spin" />
                </div>
            ) : (
                <AdminHistoryList
                    items={items}
                    searchQuery={searchQuery}
                    onSearchChange={handleSearchChange}
                    filterUserId={filterUserId}
                    onFilterUserChange={handleFilterUserChange}
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
}
