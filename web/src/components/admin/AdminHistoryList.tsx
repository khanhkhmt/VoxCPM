"use client";

import { Search } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AdminHistoryItem {
    id: string;
    text: string;
    controlInstruction: string;
    audioUrl: string;
    language: string;
    cfgValue: number;
    ditSteps: number;
    doNormalize: boolean;
    denoise: boolean;
    createdAt: string;
    voiceProfile?: { id: string; name: string } | null;
    user: { id: string; username: string; name: string };
}

interface AdminHistoryListProps {
    items: AdminHistoryItem[];
    searchQuery: string;
    onSearchChange: (q: string) => void;
    filterUserId: string;
    onFilterUserChange: (id: string) => void;
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
}

// ---------------------------------------------------------------------------
// AdminHistoryList
// ---------------------------------------------------------------------------
export default function AdminHistoryList({
    items, searchQuery, onSearchChange, filterUserId, onFilterUserChange,
    page, totalPages, total, onPageChange,
}: AdminHistoryListProps) {
    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-vox-text-dim" />
                    <input type="text" placeholder="Search text content..." value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-vox-surface border border-vox-outline/30 text-vox-text text-sm placeholder:text-vox-text-dim/50 focus:outline-none focus:border-vox-primary/50 focus:ring-1 focus:ring-vox-primary/20 transition-colors" />
                </div>
                <input type="text" placeholder="Filter by User ID..." value={filterUserId}
                    onChange={(e) => onFilterUserChange(e.target.value)}
                    className="w-48 px-3 py-2.5 rounded-xl bg-vox-surface border border-vox-outline/30 text-vox-text text-sm placeholder:text-vox-text-dim/50 focus:outline-none focus:border-vox-primary/50 transition-colors" />
                <span className="text-xs text-vox-text-dim">{total} generation{total !== 1 ? "s" : ""}</span>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-vox-outline/20 text-vox-text-dim">
                                <th className="text-left py-3 px-4 font-medium">User</th>
                                <th className="text-left py-3 px-4 font-medium">Text</th>
                                <th className="text-left py-3 px-4 font-medium">Instruction</th>
                                <th className="text-center py-3 px-4 font-medium">Lang</th>
                                <th className="text-center py-3 px-4 font-medium">Audio</th>
                                <th className="text-left py-3 px-4 font-medium">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id} className="border-b border-vox-outline/10 hover:bg-vox-surface/50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="font-medium text-vox-heading text-xs">{item.user.name}</p>
                                            <p className="text-[11px] text-vox-text-dim">@{item.user.username}</p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <p className="text-vox-text truncate max-w-[250px]" title={item.text}>{item.text}</p>
                                    </td>
                                    <td className="py-3 px-4">
                                        <p className="text-vox-text-dim truncate max-w-[180px]" title={item.controlInstruction}>
                                            {item.controlInstruction || "—"}
                                        </p>
                                        {item.voiceProfile && (
                                            <p className="text-xs text-vox-primary mt-1 truncate max-w-[180px]">
                                                🎤 {item.voiceProfile.name}
                                            </p>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className="text-xs bg-vox-surface-high px-2 py-0.5 rounded-full text-vox-text-dim">{item.language}</span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {item.audioUrl ? (
                                            <audio controls preload="none" className="h-8 w-32">
                                                <source src={item.audioUrl} />
                                            </audio>
                                        ) : <span className="text-vox-text-dim">—</span>}
                                    </td>
                                    <td className="py-3 px-4 text-vox-text-dim text-xs whitespace-nowrap">
                                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr><td colSpan={6} className="py-12 text-center text-vox-text-dim">No generations found.</td></tr>
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
