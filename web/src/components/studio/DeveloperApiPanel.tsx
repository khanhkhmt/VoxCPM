"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Key, Trash2, Copy, Check, Shield, Zap, ExternalLink,
    RefreshCw, Ban, Mic, BarChart3, BookOpen,
    TerminalSquare, ArrowRight, Clock, Loader2,
} from "lucide-react";
import ApiKeyCreatedModal from "@/components/studio/ApiKeyCreatedModal";
import { useI18n } from "@/i18n";

interface VoiceInfo { id: string; name: string; fileName?: string; audioUrl?: string; }
interface ApiKeyData {
    id: string; name: string; prefix: string; lastFour: string; scopes: string;
    environment: string; isActive: boolean; usageCount: number; rateLimit: number;
    expiresAt: string | null; revokedAt: string | null; lastUsedAt: string | null;
    createdAt: string; voiceProfileId: string; voiceProfile: VoiceInfo;
}
interface QuotaStatus { limit: number; used: number; remaining: number; resetDate: string; }

export default function DeveloperApiPanel({ initialQuota }: { initialQuota: QuotaStatus }) {
    const { t } = useI18n();
    const [keys, setKeys] = useState<ApiKeyData[]>([]);
    const [quota] = useState<QuotaStatus>(initialQuota);
    const [loading, setLoading] = useState(true);
    const [createdKeyModal, setCreatedKeyModal] = useState<{ voiceName: string; plainKey: string } | null>(null);
    const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => { fetchKeys(); }, []);

    const fetchKeys = async () => {
        try {
            const res = await fetch("/api/keys");
            const data = await res.json();
            if (data.ok) setKeys(data.data.keys);
        } catch (err) { console.error("Failed to fetch keys", err); }
        finally { setLoading(false); }
    };

    const handleRevokeKey = async (id: string) => {
        if (!confirm(t.api.console.confirmRevoke)) return;
        setActionLoading(id);
        try {
            const res = await fetch(`/api/keys/${id}`, { method: "PATCH" });
            const data = await res.json();
            if (data.ok) setKeys(keys.map(k => k.id === id ? { ...k, isActive: false, revokedAt: new Date().toISOString() } : k));
        } catch (err) { console.error("Failed to revoke key", err); }
        finally { setActionLoading(null); }
    };

    const handleRegenerateKey = async (id: string) => {
        if (!confirm(t.api.console.confirmRegenerate)) return;
        setActionLoading(id);
        try {
            const res = await fetch(`/api/keys/${id}`, { method: "PUT" });
            const data = await res.json();
            if (data.ok) {
                setKeys(prev => prev.map(k => k.id === id ? data.data.key : k));
                setCreatedKeyModal({ voiceName: data.data.key.voiceProfile?.name || "Voice", plainKey: data.data.plainKey });
            }
        } catch (err) { console.error("Failed to regenerate key", err); }
        finally { setActionLoading(null); }
    };

    const handleDeleteKey = async (id: string) => {
        if (!confirm(t.api.console.confirmDelete)) return;
        setActionLoading(id);
        try {
            const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.ok) setKeys(keys.filter(k => k.id !== id));
        } catch (err) { console.error("Failed to delete key", err); }
        finally { setActionLoading(null); }
    };

    const copyMaskedKey = (key: ApiKeyData) => {
        navigator.clipboard.writeText(`vc_sk_live_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022${key.lastFour}`);
        setCopiedKeyId(key.id);
        setTimeout(() => setCopiedKeyId(null), 2000);
    };

    const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const formatRelativeDate = (iso: string | null) => {
        if (!iso) return "Never";
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now"; if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return formatDate(iso);
    };

    const quotaPercentage = Math.min(100, (quota.used / quota.limit) * 100);
    const activeKeys = keys.filter(k => k.isActive);
    const revokedKeys = keys.filter(k => !k.isActive);

    return (
        <div className="flex flex-col gap-8 pb-12">
            {createdKeyModal && <ApiKeyCreatedModal voiceName={createdKeyModal.voiceName} plainKey={createdKeyModal.plainKey} onClose={() => setCreatedKeyModal(null)} />}

            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-vox-heading tracking-tight">{t.api.console.title}</h1>
                <p className="text-sm text-vox-text-dim mt-1">{t.api.console.subtitle}</p>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href="/studio/voices" className="flex items-center gap-3 bg-vox-surface border border-vox-outline/15 rounded-xl p-4 hover:border-vox-primary/30 transition-all group">
                    <div className="w-10 h-10 rounded-lg bg-vox-primary/10 flex items-center justify-center"><Mic size={18} className="text-vox-primary" /></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-vox-heading">{t.api.console.voiceLibrary}</p>
                        <p className="text-xs text-vox-text-dim">{t.api.console.uploadVoicesKeys}</p>
                    </div>
                    <ArrowRight size={16} className="text-vox-text-dim group-hover:text-vox-primary transition-colors" />
                </Link>
                <Link href="/studio/playground" className="flex items-center gap-3 bg-vox-surface border border-vox-outline/15 rounded-xl p-4 hover:border-vox-secondary/30 transition-all group">
                    <div className="w-10 h-10 rounded-lg bg-vox-secondary/10 flex items-center justify-center"><TerminalSquare size={18} className="text-vox-secondary" /></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-vox-heading">{t.api.console.playground}</p>
                        <p className="text-xs text-vox-text-dim">{t.api.console.testKeysLive}</p>
                    </div>
                    <ArrowRight size={16} className="text-vox-text-dim group-hover:text-vox-secondary transition-colors" />
                </Link>
                <Link href="/studio/api-docs" className="flex items-center gap-3 bg-vox-surface border border-vox-outline/15 rounded-xl p-4 hover:border-amber-500/30 transition-all group">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><BookOpen size={18} className="text-amber-400" /></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-vox-heading">{t.api.console.apiDocs}</p>
                        <p className="text-xs text-vox-text-dim">{t.api.console.endpointsExamples}</p>
                    </div>
                    <ArrowRight size={16} className="text-vox-text-dim group-hover:text-amber-400 transition-colors" />
                </Link>
            </div>

            {/* Usage & Quota */}
            <section className="bg-vox-surface border border-vox-outline/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-vox-primary/10 flex items-center justify-center"><Zap size={20} className="text-vox-primary" /></div>
                        <div>
                            <h2 className="text-lg font-semibold text-vox-heading">{t.api.console.usageQuota}</h2>
                            <p className="text-sm text-vox-text-dim">{t.api.console.monthlyAllowance}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-vox-text-dim">{t.api.console.resetsOn}</p>
                        <p className="text-sm font-medium text-vox-heading">{new Date(quota.resetDate).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-vox-text-dim font-medium">{t.api.console.monthlyProgress}</span>
                        <span className="text-vox-heading font-bold">{quota.used.toLocaleString()} / {quota.limit.toLocaleString()} chars</span>
                    </div>
                    <div className="w-full h-3 bg-vox-surface-low rounded-full overflow-hidden border border-vox-outline/10">
                        <div className={`h-full transition-all duration-1000 ease-out rounded-full ${quotaPercentage > 90 ? "bg-red-500" : quotaPercentage > 70 ? "bg-amber-500" : "bg-vox-primary"}`}
                            style={{ width: `${quotaPercentage}%` }} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="bg-vox-surface-low p-4 rounded-xl border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim uppercase tracking-wider font-bold mb-1">{t.api.console.used}</p>
                            <p className="text-xl font-bold text-vox-heading">{quota.used.toLocaleString()}</p>
                        </div>
                        <div className="bg-vox-surface-low p-4 rounded-xl border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim uppercase tracking-wider font-bold mb-1">{t.api.console.remaining}</p>
                            <p className="text-xl font-bold text-vox-heading">{quota.remaining.toLocaleString()}</p>
                        </div>
                        <div className="bg-vox-surface-low p-4 rounded-xl border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim uppercase tracking-wider font-bold mb-1">{t.api.console.activeKeys}</p>
                            <p className="text-xl font-bold text-vox-primary">{activeKeys.length}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Per-Voice API Keys info */}
            <section className="bg-vox-primary/5 border border-vox-primary/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                    <Shield className="text-vox-primary shrink-0 mt-0.5" size={20} />
                    <div>
                        <h3 className="text-sm font-bold text-vox-heading mb-1">{t.api.console.perVoiceKeys}</h3>
                        <p className="text-sm text-vox-text-dim leading-relaxed">
                            Each voice clone has its own unique API key. You do not need to pass <code className="text-xs bg-vox-surface px-1 py-0.5 rounded font-mono">voice_id</code> in
                            your requests &mdash; the server automatically detects the voice from the API key. Go to your{" "}
                            <Link href="/studio/voices" className="text-vox-primary hover:underline">Voice Library</Link> to create new keys.
                        </p>
                    </div>
                </div>
            </section>

            {/* Quick Start */}
            <section className="bg-vox-surface border border-vox-outline/20 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-vox-outline/10">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Zap size={16} className="text-emerald-400" /></div>
                    <h2 className="text-base font-semibold text-vox-heading">{t.api.console.quickStart}</h2>
                </div>
                <div className="px-6 py-5">
                    <p className="text-sm text-vox-text-dim mb-4">{t.api.console.quickStartDesc}</p>
                    <div className="relative rounded-xl overflow-hidden border border-vox-outline/20 bg-[#1a1b26]">
                        <div className="flex items-center justify-between px-4 py-2 bg-[#13141c] border-b border-vox-outline/10 text-xs text-gray-400 font-mono">
                            <span>bash</span>
                        </div>
                        <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-300 leading-relaxed whitespace-pre">{`curl -X POST ${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/v1/tts/generate \\
  -H "Authorization: Bearer vc_sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hello, this is my cloned voice!", "mode": "blocking"}'`}</pre>
                    </div>
                </div>
            </section>

            {/* Voice API Access — Card Layout */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-vox-heading flex items-center gap-2">
                        <Key size={20} className="text-vox-secondary" /> {t.api.console.voiceApiAccess}
                    </h2>
                    <Link href="/studio/api-docs" className="flex items-center gap-1.5 text-sm text-vox-primary hover:text-vox-primary/80 transition-colors">
                        <ExternalLink size={14} /> {t.api.console.apiDocs}
                    </Link>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 size={24} className="animate-spin text-vox-primary" />
                        <p className="text-sm text-vox-text-dim">{t.api.console.loadingKeys}</p>
                    </div>
                ) : activeKeys.length === 0 ? (
                    <div className="bg-vox-surface border border-vox-outline/20 rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-vox-surface-low flex items-center justify-center mx-auto mb-4">
                            <Mic size={28} className="text-vox-text-dim opacity-30" />
                        </div>
                        <p className="text-vox-text-dim mb-4">{t.api.console.noActiveKeysDesc}</p>
                        <Link href="/studio/voices" className="inline-flex items-center gap-2 px-4 py-2.5 bg-vox-primary text-white rounded-xl text-sm font-semibold hover:bg-vox-primary/90 transition-colors">
                            <Mic size={16} /> {t.api.console.goToVoiceLibrary}
                        </Link>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                        {activeKeys.map((key) => (
                            <div key={key.id} className="bg-vox-surface border border-vox-outline/15 rounded-2xl overflow-hidden hover:border-vox-primary/25 transition-all">
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Mic size={16} className="text-vox-secondary" />
                                            <h3 className="text-sm font-bold text-vox-heading">{key.voiceProfile?.name || "Unknown Voice"}</h3>
                                        </div>
                                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-md border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{t.voiceLibrary.active}</span>
                                    </div>

                                    <div className="bg-vox-surface-low/60 border border-vox-outline/10 rounded-xl p-3 mb-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-bold text-vox-text-dim uppercase tracking-wider">API Key</span>
                                            <button onClick={() => copyMaskedKey(key)} className="text-vox-text-dim hover:text-vox-primary transition-colors" title="Copy masked key">
                                                {copiedKeyId === key.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                        <p className="font-mono text-xs text-vox-heading">vc_sk_live_&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;{key.lastFour}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <span className="text-vox-text-dim">{t.api.console.usage}</span>
                                            <p className="text-vox-heading font-semibold flex items-center gap-1"><BarChart3 size={12} /> {key.usageCount} {t.voiceLibrary.requests}</p>
                                        </div>
                                        <div>
                                            <span className="text-vox-text-dim">{t.voiceLibrary.lastUsed}</span>
                                            <p className="text-vox-heading font-semibold flex items-center gap-1"><Clock size={12} /> {formatRelativeDate(key.lastUsedAt)}</p>
                                        </div>
                                        <div>
                                            <span className="text-vox-text-dim">{t.api.console.created}</span>
                                            <p className="text-vox-heading font-semibold">{formatDate(key.createdAt)}</p>
                                        </div>
                                        <div>
                                            <span className="text-vox-text-dim">{t.api.console.rateLimit}</span>
                                            <p className="text-vox-heading font-semibold">{key.rateLimit} req/min</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-4 py-3 border-t border-vox-outline/10 bg-vox-surface-low/30 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <Link href="/studio/playground" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-vox-secondary hover:bg-vox-secondary/10 transition-colors font-medium">
                                            <TerminalSquare size={12} /> {t.api.console.playground}
                                        </Link>
                                        <Link href="/studio/api-docs" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface transition-colors font-medium">
                                            <BookOpen size={12} /> {t.api.console.docs}
                                        </Link>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                        <button onClick={() => handleRegenerateKey(key.id)} disabled={actionLoading === key.id}
                                            className="p-2 text-vox-text-dim hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors" title="Rotate Key">
                                            <RefreshCw size={14} className={actionLoading === key.id ? "animate-spin" : ""} />
                                        </button>
                                        <button onClick={() => handleRevokeKey(key.id)} disabled={actionLoading === key.id}
                                            className="p-2 text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Revoke">
                                            <Ban size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteKey(key.id)} disabled={actionLoading === key.id}
                                            className="p-2 text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Revoked Keys */}
            {revokedKeys.length > 0 && (
                <section>
                    <h2 className="text-lg font-bold text-vox-heading mb-4 flex items-center gap-2 opacity-60"><Ban size={18} /> {t.api.console.revokedKeys}</h2>
                    <div className="bg-vox-surface border border-vox-outline/20 rounded-2xl overflow-hidden opacity-70">
                        <div className="divide-y divide-vox-outline/10">
                            {revokedKeys.map((key) => (
                                <div key={key.id} className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <Mic size={14} className="text-vox-text-dim" />
                                        <span className="text-sm text-vox-text-dim">{key.voiceProfile?.name || "Unknown"}</span>
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border bg-red-500/10 text-red-400 border-red-500/20">{t.api.console.revoked}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-vox-text-dim">{key.revokedAt ? formatDate(key.revokedAt) : ""}</span>
                                        <button onClick={() => handleDeleteKey(key.id)} disabled={actionLoading === key.id}
                                            className="p-2 text-vox-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete permanently">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
