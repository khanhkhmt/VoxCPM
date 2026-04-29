"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
    Key, 
    Plus, 
    Trash2, 
    Copy, 
    Check, 
    Calendar, 
    Shield, 
    Zap,
    ExternalLink,
    AlertCircle
} from "lucide-react";

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    lastFour: string;
    scopes: string;
    environment: "test" | "live";
    isActive: boolean;
    expiresAt: string | null;
    revokedAt: string | null;
    lastUsedAt: string | null;
    createdAt: string;
}

interface QuotaStatus {
    limit: number;
    used: number;
    remaining: number;
    resetDate: string;
}

export default function ApiKeysPanel({ 
    initialQuota 
}: { 
    initialQuota: QuotaStatus 
}) {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [quota] = useState<QuotaStatus>(initialQuota);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [newKeyEnv, setNewKeyEnv] = useState<"test" | "live">("test");
    const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState(false);

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

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch("/api/keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newKeyName, environment: newKeyEnv })
            });
            const data = await res.json();
            if (data.ok) {
                setKeys([data.data.key, ...keys]);
                setLastCreatedKey(data.data.plainKey);
                setNewKeyName("");
            }
        } catch (err) {
            console.error("Failed to create key", err);
        } finally {
            setCreating(false);
        }
    };

    const handleRevokeKey = async (id: string) => {
        if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
        
        try {
            const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.ok) {
                setKeys(keys.map(k => k.id === id ? { ...k, isActive: false, revokedAt: new Date().toISOString() } : k));
            }
        } catch (err) {
            console.error("Failed to revoke key", err);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    const quotaPercentage = Math.min(100, (quota.used / quota.limit) * 100);

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
                                quotaPercentage > 90 ? 'bg-red-500' : quotaPercentage > 70 ? 'bg-amber-500' : 'bg-vox-primary'
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
                            <p className="text-xs text-vox-text-dim uppercase tracking-wider font-bold mb-1">Status</p>
                            <p className="text-xl font-bold text-vox-primary">Active</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Create Key Section */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-vox-heading flex items-center gap-2">
                        <Key size={20} className="text-vox-secondary" />
                        API Keys
                    </h2>
                </div>

                {lastCreatedKey && (
                    <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                            <div className="flex-1">
                                <h3 className="text-amber-500 font-bold text-sm mb-1">Save your API key</h3>
                                <p className="text-vox-text-dim text-sm mb-4">
                                    For security, we only show this key once. Copy it now and store it safely.
                                </p>
                                <div className="flex items-center gap-2 bg-vox-surface-low border border-vox-outline/20 p-3 rounded-lg group">
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
                                className="text-vox-text-dim hover:text-vox-heading transition-colors"
                            >
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-vox-surface border border-vox-outline/20 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-vox-outline/10 bg-vox-surface-low/50">
                        <form onSubmit={handleCreateKey} className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <input 
                                    type="text" 
                                    placeholder="Key Name (e.g. Production App)"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    className="w-full bg-vox-surface border border-vox-outline/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vox-primary/50 transition-all"
                                    required
                                />
                            </div>
                            <div className="flex gap-2">
                                <select 
                                    value={newKeyEnv}
                                    onChange={(e) => setNewKeyEnv(e.target.value as "test" | "live")}
                                    className="bg-vox-surface border border-vox-outline/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all"
                                >
                                    <option value="test">Test Environment</option>
                                    <option value="live">Live Environment</option>
                                </select>
                                <button 
                                    type="submit" 
                                    disabled={creating}
                                    className="bg-vox-primary hover:bg-vox-primary/90 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {creating ? "Creating..." : <><Plus size={18} /> Create Key</>}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-vox-surface-low/30 text-xs uppercase tracking-wider text-vox-text-dim font-bold">
                                    <th className="px-6 py-4">Name / ID</th>
                                    <th className="px-6 py-4">Environment</th>
                                    <th className="px-6 py-4">Status</th>
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
                                                <div className="w-6 h-6 border-2 border-vox-primary border-t-transparent rounded-full animate-spin"></div>
                                                Loading API Keys...
                                            </div>
                                        </td>
                                    </tr>
                                ) : keys.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3 text-vox-text-dim">
                                                <Key size={32} className="opacity-20" />
                                                <p>No API keys found. Create your first key to start using VoxCPM via API.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    keys.map((key) => (
                                        <tr key={key.id} className={`group hover:bg-vox-surface-low/50 transition-colors ${!key.isActive ? 'opacity-60' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-vox-heading">{key.name}</span>
                                                    <span className="text-xs font-mono text-vox-text-dim flex items-center gap-1">
                                                        {key.prefix}••••••••{key.lastFour}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md border ${
                                                    key.environment === 'live' 
                                                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                                        : 'bg-vox-secondary/10 text-vox-secondary border-vox-secondary/20'
                                                }`}>
                                                    {key.environment}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {key.isActive ? (
                                                    <span className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                        {key.revokedAt ? 'Revoked' : 'Inactive'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-xs text-vox-text-dim">
                                                    <Calendar size={12} />
                                                    {new Date(key.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-vox-text-dim">
                                                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never used'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {key.isActive && (
                                                    <button 
                                                        onClick={() => handleRevokeKey(key.id)}
                                                        className="p-2 hover:bg-red-500/10 text-vox-text-dim hover:text-red-500 rounded-lg transition-all"
                                                        title="Revoke Key"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Docs Mini Section */}
            <section className="bg-gradient-to-br from-vox-primary/5 to-vox-secondary/5 border border-vox-outline/20 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-vox-surface flex items-center justify-center text-vox-primary shadow-sm">
                        <Shield size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-vox-heading">Developer Documentation</h3>
                        <p className="text-sm text-vox-text-dim">Learn how to integrate VoxCPM APIs into your application with our comprehensive guides.</p>
                    </div>
                    <Link href="/studio/api-docs" className="flex items-center gap-2 text-sm font-bold text-vox-primary hover:gap-3 transition-all">
                        View API Docs <ExternalLink size={16} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
