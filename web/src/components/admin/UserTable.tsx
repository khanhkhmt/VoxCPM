"use client";

import { useState, useCallback } from "react";
import { Search, ShieldCheck, ShieldOff, Lock, Unlock } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AdminUser {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    _count: { generations: number; voiceProfiles: number };
}

interface UserTableProps {
    users: AdminUser[];
    currentAdminId: string;
    onUserUpdated: () => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
}

// ---------------------------------------------------------------------------
// UserTable
// ---------------------------------------------------------------------------
export default function UserTable({
    users, currentAdminId, onUserUpdated, searchQuery, onSearchChange,
    page, totalPages, total, onPageChange,
}: UserTableProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const patchUser = useCallback(async (userId: string, data: { role?: string; isActive?: boolean }) => {
        setLoadingId(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                credentials: "include", body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!json.ok) { alert(json.error?.message || "Failed to update user"); return; }
            onUserUpdated();
        } catch { alert("Network error"); } finally { setLoadingId(null); }
    }, [onUserUpdated]);

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-vox-text-dim" />
                    <input type="text" placeholder="Search by username or name..." value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-vox-surface border border-vox-outline/30 text-vox-text text-sm placeholder:text-vox-text-dim/50 focus:outline-none focus:border-vox-primary/50 focus:ring-1 focus:ring-vox-primary/20 transition-colors" />
                </div>
                <span className="text-xs text-vox-text-dim whitespace-nowrap">{total} user{total !== 1 ? "s" : ""}</span>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-vox-outline/20 text-vox-text-dim">
                                <th className="text-left py-3 px-4 font-medium">User</th>
                                <th className="text-left py-3 px-4 font-medium">Role</th>
                                <th className="text-center py-3 px-4 font-medium">Status</th>
                                <th className="text-center py-3 px-4 font-medium">Gens</th>
                                <th className="text-center py-3 px-4 font-medium">Voices</th>
                                <th className="text-left py-3 px-4 font-medium">Joined</th>
                                <th className="text-right py-3 px-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => {
                                const isSelf = user.id === currentAdminId;
                                const isLoading = loadingId === user.id;
                                return (
                                    <tr key={user.id} className={`border-b border-vox-outline/10 transition-colors ${isSelf ? "bg-vox-primary/5" : "hover:bg-vox-surface/50"} ${!user.isActive ? "opacity-60" : ""}`}>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={user.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${user.username}`} alt="" className="w-8 h-8 rounded-full bg-vox-surface-high" />
                                                <div>
                                                    <p className="font-medium text-vox-heading truncate max-w-[160px]">
                                                        {user.name}{isSelf && <span className="ml-1.5 text-[10px] text-vox-primary font-bold">(You)</span>}
                                                    </p>
                                                    <p className="text-xs text-vox-text-dim">@{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${user.role === "admin" ? "bg-amber-500/10 text-amber-500" : "bg-vox-surface-high text-vox-text-dim"}`}>
                                                {user.role === "admin" ? "Admin" : "User"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${user.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"}`}>
                                                {user.isActive ? "Active" : "Locked"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center text-vox-text-dim">{user._count.generations}</td>
                                        <td className="py-3 px-4 text-center text-vox-text-dim">{user._count.voiceProfiles}</td>
                                        <td className="py-3 px-4 text-vox-text-dim text-xs">{new Date(user.createdAt).toLocaleDateString("vi-VN")}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {isSelf ? <span className="text-[11px] text-vox-text-dim italic">—</span> : (
                                                    <>
                                                        <button onClick={() => patchUser(user.id, { role: user.role === "admin" ? "user" : "admin" })}
                                                            disabled={isLoading} title={user.role === "admin" ? "Demote to User" : "Promote to Admin"}
                                                            className="p-1.5 rounded-lg hover:bg-vox-surface-highest text-vox-text-dim hover:text-amber-500 transition-colors disabled:opacity-40">
                                                            {user.role === "admin" ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                                                        </button>
                                                        <button onClick={() => patchUser(user.id, { isActive: !user.isActive })}
                                                            disabled={isLoading} title={user.isActive ? "Lock Account" : "Unlock Account"}
                                                            className={`p-1.5 rounded-lg hover:bg-vox-surface-highest transition-colors disabled:opacity-40 ${user.isActive ? "text-vox-text-dim hover:text-red-400" : "text-red-400 hover:text-emerald-500"}`}>
                                                            {user.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {users.length === 0 && (
                                <tr><td colSpan={7} className="py-12 text-center text-vox-text-dim">No users found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
                        className="px-3 py-1.5 rounded-lg text-sm text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed">← Prev</button>
                    <span className="text-sm text-vox-text-dim px-3">Page {page} / {totalPages}</span>
                    <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
                        className="px-3 py-1.5 rounded-lg text-sm text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Next →</button>
                </div>
            )}
        </div>
    );
}
