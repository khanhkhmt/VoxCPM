"use client";

import { useEffect, useState } from "react";
import StatsCards, { type StatsData } from "@/components/admin/StatsCards";

// ---------------------------------------------------------------------------
// /admin — Dashboard page
// ---------------------------------------------------------------------------
export default function AdminDashboardPage() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch("/api/admin/stats", { credentials: "include" });
                const json = await res.json();
                if (!json.ok) throw new Error(json.error?.message || "Failed to load stats");
                setStats(json.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-vox-heading tracking-tight">Dashboard</h1>
                <p className="text-sm text-vox-text-dim mt-1">System overview and statistics.</p>
            </div>

            {/* Stats */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-vox-primary/30 border-t-vox-primary rounded-full animate-spin" />
                </div>
            ) : error ? (
                <div className="glass-panel rounded-2xl p-8 text-center">
                    <p className="text-red-400">{error}</p>
                </div>
            ) : stats ? (
                <StatsCards data={stats} />
            ) : null}
        </div>
    );
}
