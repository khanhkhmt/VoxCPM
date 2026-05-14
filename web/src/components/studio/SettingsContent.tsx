"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/i18n";
import { Shield, Sun, Moon, Monitor, Save, Check, Loader2 } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";

function SettingSection({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
    return (
        <section className="bg-vox-surface border border-vox-outline/20 rounded-2xl overflow-visible">
            <div className="px-6 py-5 border-b border-vox-outline/10">
                <h2 className="text-lg font-semibold text-vox-heading">{title}</h2>
                {desc && <p className="text-sm text-vox-text-dim mt-0.5">{desc}</p>}
            </div>
            <div className="px-6 py-5 space-y-5">{children}</div>
        </section>
    );
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
    return (
        <div>
            <label className="block text-xs font-bold text-vox-text-dim uppercase tracking-wider mb-2">{label}</label>
            {children}
            {hint && <p className="text-xs text-vox-text-dim mt-1.5">{hint}</p>}
        </div>
    );
}

function ReadonlyField({ value }: { value: string }) {
    return (
        <div className="bg-vox-surface-low border border-vox-outline/10 rounded-xl px-4 py-3 text-sm text-vox-text-dim font-mono select-all">
            {value}
        </div>
    );
}

export default function SettingsContent({ quota }: { quota: { limit: number; used: number; remaining: number; resetDate: string } }) {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const { t } = useI18n();

    const [displayName, setDisplayName] = useState(user?.name || "");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [pwSaving, setPwSaving] = useState(false);
    const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const quotaPct = Math.min(100, (quota.used / quota.limit) * 100);

    const handleSaveProfile = async () => {
        if (!displayName.trim()) return;
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch("/api/auth/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: displayName.trim() }),
            });
            if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
        } catch { /* noop */ }
        setSaving(false);
    };

    const handleChangePw = async () => {
        if (!currentPw || !newPw) return;
        if (newPw !== confirmPw) { setPwMsg({ ok: false, text: t.settings.security.passwordsNoMatch }); return; }
        if (newPw.length < 6) { setPwMsg({ ok: false, text: t.settings.security.passwordTooShort }); return; }
        setPwSaving(true);
        setPwMsg(null);
        try {
            const res = await fetch("/api/auth/password", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
            });
            const data = await res.json();
            if (res.ok) {
                setPwMsg({ ok: true, text: t.settings.security.passwordUpdated });
                setCurrentPw(""); setNewPw(""); setConfirmPw("");
            } else {
                setPwMsg({ ok: false, text: data.error?.message || t.settings.security.failedUpdate });
            }
        } catch {
            setPwMsg({ ok: false, text: t.settings.security.networkError });
        }
        setPwSaving(false);
    };

    const themeOptions = [
        { value: "dark", label: t.settings.appearance.dark, icon: Moon },
        { value: "light", label: t.settings.appearance.light, icon: Sun },
        { value: "system", label: t.settings.appearance.system, icon: Monitor },
    ] as const;

    return (
        <div className="max-w-3xl mx-auto py-8 px-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-vox-heading tracking-tight">{t.settings.title}</h1>
                <p className="text-vox-text-dim mt-2">{t.settings.subtitle}</p>
            </header>

            <div className="flex flex-col gap-6">
                {/* ── Profile ── */}
                <SettingSection title={t.settings.profile.title} desc={t.settings.profile.desc}>
                    <div className="flex items-center gap-5 mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={user?.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${user?.username}`}
                            alt="Avatar"
                            className="w-16 h-16 rounded-full border-2 border-vox-outline/20 bg-vox-surface-high"
                        />
                        <div>
                            <p className="text-sm font-semibold text-vox-heading">{user?.name}</p>
                            <p className="text-xs text-vox-text-dim">@{user?.username}</p>
                        </div>
                    </div>

                    <FieldRow label={t.settings.profile.username} hint={t.settings.profile.usernameCantChange}>
                        <ReadonlyField value={user?.username || ""} />
                    </FieldRow>

                    <FieldRow label={t.settings.profile.displayName} hint={t.settings.profile.displayNameHint}>
                        <div className="flex gap-2">
                            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                                className="flex-1 bg-vox-surface-low border border-vox-outline/20 rounded-xl px-4 py-2.5 text-sm text-vox-heading outline-none focus:border-vox-primary transition-colors" />
                            <button onClick={handleSaveProfile} disabled={saving || !displayName.trim()}
                                className="flex items-center gap-2 px-4 py-2.5 bg-vox-primary text-white text-sm font-semibold rounded-xl hover:bg-vox-primary/90 transition-colors disabled:opacity-40">
                                {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
                                {saved ? t.common.saved : t.common.save}
                            </button>
                        </div>
                    </FieldRow>
                </SettingSection>

                {/* ── Security ── */}
                <SettingSection title={t.settings.security.title} desc={t.settings.security.desc}>
                    <FieldRow label={t.settings.security.currentPassword}>
                        <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                            className="w-full bg-vox-surface-low border border-vox-outline/20 rounded-xl px-4 py-2.5 text-sm text-vox-heading outline-none focus:border-vox-primary transition-colors" placeholder={t.settings.security.enterCurrentPassword} />
                    </FieldRow>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldRow label={t.settings.security.newPassword}>
                            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                                className="w-full bg-vox-surface-low border border-vox-outline/20 rounded-xl px-4 py-2.5 text-sm text-vox-heading outline-none focus:border-vox-primary transition-colors" placeholder={t.settings.security.minChars} />
                        </FieldRow>
                        <FieldRow label={t.settings.security.confirmPassword}>
                            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                                className="w-full bg-vox-surface-low border border-vox-outline/20 rounded-xl px-4 py-2.5 text-sm text-vox-heading outline-none focus:border-vox-primary transition-colors" placeholder={t.settings.security.reenterPassword} />
                        </FieldRow>
                    </div>
                    {pwMsg && <p className={`text-sm ${pwMsg.ok ? "text-green-400" : "text-red-400"}`}>{pwMsg.text}</p>}
                    <button onClick={handleChangePw} disabled={pwSaving || !currentPw || !newPw}
                        className="flex items-center gap-2 px-4 py-2.5 bg-vox-surface-low border border-vox-outline/20 text-vox-heading text-sm font-semibold rounded-xl hover:bg-vox-surface-high transition-colors disabled:opacity-40">
                        {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                        {t.settings.security.updatePassword}
                    </button>
                </SettingSection>

                {/* ── Appearance ── */}
                <SettingSection title={t.settings.appearance.title} desc={t.settings.appearance.desc}>
                    <FieldRow label={t.settings.appearance.theme}>
                        <div className="flex gap-2">
                            {themeOptions.map(opt => (
                                <button key={opt.value}
                                    onClick={() => setTheme(opt.value as "dark" | "light")}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                                        theme === opt.value
                                            ? "bg-vox-primary/10 border-vox-primary/30 text-vox-primary"
                                            : "bg-vox-surface-low border-vox-outline/20 text-vox-text-dim hover:text-vox-heading"
                                    }`}>
                                    <opt.icon size={16} /> {opt.label}
                                </button>
                            ))}
                        </div>
                    </FieldRow>
                </SettingSection>

                {/* ── Language ── */}
                <SettingSection title={t.settings.language.title} desc={t.settings.language.desc}>
                    <FieldRow label={t.settings.language.label}>
                        <LanguageSelector variant="full" />
                    </FieldRow>
                </SettingSection>

                {/* ── Usage Quota ── */}
                <SettingSection title={t.settings.usageQuota.title} desc={t.settings.usageQuota.desc}>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-vox-text-dim font-medium">{t.settings.usageQuota.monthlyProgress}</span>
                        <span className="text-vox-heading font-bold">{quota.used.toLocaleString()} / {quota.limit.toLocaleString()} chars</span>
                    </div>
                    <div className="w-full h-3 bg-vox-surface-low rounded-full overflow-hidden border border-vox-outline/10">
                        <div className={`h-full transition-all duration-1000 ease-out rounded-full ${quotaPct > 90 ? "bg-red-500" : quotaPct > 70 ? "bg-amber-500" : "bg-vox-primary"}`}
                            style={{ width: `${quotaPct}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                        <div className="bg-vox-surface-low rounded-xl p-3 border border-vox-outline/10 text-center">
                            <p className="text-xs text-vox-text-dim">{t.settings.usageQuota.remaining}</p>
                            <p className="text-sm font-bold text-vox-heading">{quota.remaining.toLocaleString()}</p>
                        </div>
                        <div className="bg-vox-surface-low rounded-xl p-3 border border-vox-outline/10 text-center">
                            <p className="text-xs text-vox-text-dim">{t.settings.usageQuota.used}</p>
                            <p className="text-sm font-bold text-vox-heading">{quota.used.toLocaleString()}</p>
                        </div>
                        <div className="bg-vox-surface-low rounded-xl p-3 border border-vox-outline/10 text-center">
                            <p className="text-xs text-vox-text-dim">{t.settings.usageQuota.resets}</p>
                            <p className="text-sm font-bold text-vox-heading">{new Date(quota.resetDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                </SettingSection>
            </div>
        </div>
    );
}
