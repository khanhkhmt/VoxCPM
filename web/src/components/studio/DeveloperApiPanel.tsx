"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Key,
    Trash2,
    Copy,
    Check,
    Shield,
    Zap,
    ExternalLink,
    AlertCircle,
    RefreshCw,
    Ban,
    Mic,
    BarChart3,
} from "lucide-react";

interface VoiceInfo {
    id: string;
    name: string;
    fileName?: string;
    audioUrl?: string;
}

interface ApiKeyData {
    id: string;
    name: string;
    prefix: string;
    lastFour: string;
    scopes: string;
    environment: string;
    isActive: boolean;
    usageCount: number;
    rateLimit: number;
    expiresAt: string | null;
    revokedAt: string | null;
    lastUsedAt: string | null;
    createdAt: string;
    voiceProfileId: string;
    voiceProfile: VoiceInfo;
}

interface QuotaStatus {
    limit: number;
    used: number;
    remaining: number;
    resetDate: string;
}

export default function DeveloperApiPanel({
    initialQuota,
}: {
    initialQuota: QuotaStatus;
}) {
    const [keys, setKeys] = useState<ApiKeyData[]>([]);
    const [quota] = useState<QuotaStatus>(initialQuota);
    const [loading, setLoading] = useState(true);
    const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);
    const [lastCreatedVoiceName, setLastCreatedVoiceName] = useState<string>("");
    const [copiedKey, setCopiedKey] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            const res = await fetch("/api/keys");
            const data = await res.json();
            if (data.ok) {
                setKeys(data.data.keys);
            }
        } catch (err) {
            console.error("Failed to fetch keys", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeKey = async (id: string) => {
        if (!confirm("Are you sure you want to revoke this API key? The key will stop working immediately.")) return;
        setActionLoading(id);
        try {
            const res = await fetch(`/api/keys/${id}`, { method: "PATCH" });
            const data = await res.json();
            if (data.ok) {
                setKeys(keys.map(k =>
                    k.id === id ? { ...k, isActive: false, revokedAt: new Date().toISOString() } : k
                ));
            }
        } catch (err) {
            console.error("Failed to revoke key", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRegenerateKey = async (id: string) => {
        if (!confirm("Regenerate will invalidate the current key and create a new one. Continue?")) return;
        setActionLoading(id);
        try {
            const res = await fetch(`/api/keys/${id}`, { method: "PUT" });
            const data = await res.json();
            if (data.ok) {
                setKeys(prev => prev.map(k =>
                    k.id === id ? data.data.key : k
                ));
                setLastCreatedKey(data.data.plainKey);
                setLastCreatedVoiceName(data.data.key.voiceProfile?.name || "");
            }
        } catch (err) {
            console.error("Failed to regenerate key", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteKey = async (id: string) => {
        if (!confirm("Permanently delete this API key? This cannot be undone.")) return;
        setActionLoading(id);
        try {
            const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.ok) {
                setKeys(keys.filter(k => k.id !== id));
            }
        } catch (err) {
            console.error("Failed to delete key", err);
        } finally {
            setActionLoading(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    const quotaPercentage = Math.min(100, (quota.used / quota.limit) * 100);

    const activeKeys = keys.filter(k => k.isActive);
    const revokedKeys = keys.filter(k => !k.isActive);

    return (
        <div className="flex flex-col gap-8 pb-12">
            {/* Quota Section */}
            <section className="bg-vox-surface border border-vox-outline/20 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-vox-primary/10 flex items-center justify-center text-vox-primary">
                            <Zap size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-vox-heading">Usage & Quota</h2>
                            <p className="text-sm text-vox-text-dim">Your monthly character allowance</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-vox-text-dim">Resets on</p>
                        <p className="text-sm font-medium text-vox-heading">{new Date(quota.resetDate).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-vox-text-dim font-medium">Monthly Progress</span>
                        <span className="text-vox-heading font-bold">{quota.used.toLocaleString()} / {quota.limit.toLocaleString()} chars</span>
                    </div>
                    <div className="w-full h-3 bg-vox-surface-low rounded-full overflow-hidden border border-vox-outline/10">
                        <div
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${
                                quotaPercentage > 90 ? "bg-red-500" : quotaPercentage > 70 ? "bg-amber-500" : "bg-vox-primary"
                            }`}
                            style={{ width: `${quotaPercentage}%` }}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-vox-surface-low p-4 rounded-xl border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim uppercase tracking-wider font-bold mb-1">Used</p>
                            <p className="text-xl font-bold text-vox-heading">{quota.used.toLocaleString()}</p>
                        </div>
                        <div className="bg-vox-surface-low p-4 rounded-xl border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim uppercase tracking-wider font-bold mb-1">Remaining</p>
                            <p className="text-xl font-bold text-vox-heading">{quota.remaining.toLocaleString()}</p>
                        </div>
                        <div className="bg-vox-surface-low p-4 rounded-xl border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim uppercase tracking-wider font-bold mb-1">Active Keys</p>
                            <p className="text-xl font-bold text-vox-primary">{activeKeys.length}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* New Key Created Alert */}
            {lastCreatedKey && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <h3 className="text-amber-500 font-bold text-sm mb-1">
                                Save your API key{lastCreatedVoiceName ? ` for "${lastCreatedVoiceName}"` : ""}
                            </h3>
                            <p className="text-vox-text-dim text-sm mb-4">
                                For security, we only show this key once. Copy it now and store it safely.
                            </p>
                            <div className="flex items-center gap-2 bg-vox-surface-low border border-vox-outline/20 p-3 rounded-lg">
                                <code className="flex-1 font-mono text-sm text-vox-heading break-all">{lastCreatedKey}</code>
                                <button
                                    onClick={() => copyToClipboard(lastCreatedKey)}
                                    className="p-2 hover:bg-vox-surface rounded-md transition-colors text-vox-text-dim hover:text-vox-primary"
                                >
                                    {copiedKey ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setLastCreatedKey(null)}
                            className="text-vox-text-dim hover:text-vox-heading transition-colors text-xl leading-none"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}

            {/* Info Banner */}
            <section className="bg-vox-primary/5 border border-vox-primary/20 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                    <Shield className="text-vox-primary shrink-0 mt-0.5" size={20} />
                    <div>
                        <h3 className="text-sm font-bold text-vox-heading mb-1">Per-Voice API Keys</h3>
                        <p className="text-sm text-vox-text-dim leading-relaxed">
                            Each voice clone has its own unique API key. Go to your{" "}
                            <Link href="/studio/voices" className="text-vox-primary hover:underline">Voice Library</Link>{" "}
                            to upload a voice and generate an API key for it. Each key is bound to a single voice clone for enhanced security and usage tracking.
                        </p>
                    </div>
                </div>
            </section>

            {/* Active Keys */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-vox-heading flex items-center gap-2">
                        <Key size={20} className="text-vox-secondary" />
                        Voice API Keys
                    </h2>
                    <Link
                        href="/studio/api-docs"
                        className="flex items-center gap-1.5 text-sm text-vox-primary hover:text-vox-primary/80 transition-colors"
                    >
                        <ExternalLink size={14} /> View API Docs
                    </Link>
                </div>

                <div className="bg-vox-surface border border-vox-outline/20 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-vox-surface-low/30 text-xs uppercase tracking-wider text-vox-text-dim font-bold">
                                    <th className="px-6 py-4">Voice / Key</th>
                                    <th className="px-6 py-4">API Status</th>
                                    <th className="px-6 py-4">Usage</th>
                                    <th className="px-6 py-4">Created</th>
                                    <th className="px-6 py-4">Last Used</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-vox-outline/10">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-vox-text-dim">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-6 h-6 border-2 border-vox-primary border-t-transparent rounded-full animate-spin" />
                                                Loading API Keys...
                                            </div>
                                        </td>
                                    </tr>
                                ) : activeKeys.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3 text-vox-text-dim">
                                                <Mic size={32} className="opacity-20" />
                                                <p>No active API keys. Upload a voice in the Voice Library and generate an API key.</p>
                                                <Link
                                                    href="/studio/voices"
                                                    className="mt-2 px-4 py-2 bg-vox-primary/10 text-vox-primary rounded-lg text-sm hover:bg-vox-primary/20 transition-colors"
                                                >
                                                    Go to Voice Library
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    activeKeys.map((key) => (
                                        <tr key={key.id} className="group hover:bg-vox-surface-low/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Mic size={14} className="text-vox-secondary" />
                                                        <span className="text-sm font-bold text-vox-heading">{key.voiceProfile?.name || "Unknown Voice"}</span>
                                                    </div>
                                                    <span className="text-xs font-mono text-vox-text-dim flex items-center gap-1">
                                                        vc_sk_live_••••{key.lastFour}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-md border bg-green-500/10 text-green-500 border-green-500/20">
                                                    Active
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <BarChart3 size={14} className="text-vox-text-dim" />
                                                    <span className="text-sm text-vox-heading">{key.usageCount}</span>
                                                    <span className="text-xs text-vox-text-dim">requests</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-vox-text-dim">
                                                {new Date(key.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-vox-text-dim">
                                                {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleRegenerateKey(key.id)}
                                                        disabled={actionLoading === key.id}
                                                        className="p-2 text-vox-text-dim hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                                                        title="Regenerate"
                                                    >
                                                        <RefreshCw size={16} className={actionLoading === key.id ? "animate-spin" : ""} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRevokeKey(key.id)}
                                                        disabled={actionLoading === key.id}
                                                        className="p-2 text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Revoke"
                                                    >
                                                        <Ban size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteKey(key.id)}
                                                        disabled={actionLoading === key.id}
                                                        className="p-2 text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <Link
                                                        href="/studio/api-docs"
                                                        className="p-2 text-vox-text-dim hover:text-vox-primary hover:bg-vox-primary/10 rounded-lg transition-colors"
                                                        title="View Docs"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Revoked Keys */}
            {revokedKeys.length > 0 && (
                <section>
                    <h2 className="text-lg font-bold text-vox-heading mb-4 flex items-center gap-2 opacity-60">
                        <Ban size={18} />
                        Revoked Keys
                    </h2>
                    <div className="bg-vox-surface border border-vox-outline/20 rounded-2xl overflow-hidden shadow-sm opacity-70">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <tbody className="divide-y divide-vox-outline/10">
                                    {revokedKeys.map((key) => (
                                        <tr key={key.id} className="group">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Mic size={14} className="text-vox-text-dim" />
                                                    <span className="text-sm text-vox-text-dim">{key.voiceProfile?.name || "Unknown"}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-md border bg-red-500/10 text-red-400 border-red-500/20">
                                                    Revoked
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-sm text-vox-text-dim">
                                                Revoked {key.revokedAt ? new Date(key.revokedAt).toLocaleDateString() : ""}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteKey(key.id)}
                                                    disabled={actionLoading === key.id}
                                                    className="p-2 text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete permanently"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
