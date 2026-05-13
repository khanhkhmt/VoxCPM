"use client";
import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";

export function CopyBlock({ code, language = "bash" }: { code: string; language?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return (
        <div className="relative group rounded-xl overflow-hidden border border-vox-outline/20 bg-[#1a1b26]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#13141c] border-b border-vox-outline/10 text-xs text-gray-400 font-mono">
                <span>{language}</span>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
                    {copied ? <><Check size={14} className="text-green-400" /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-300 leading-relaxed whitespace-pre">{code}</pre>
        </div>
    );
}

export function ParamRow({ name, type, required, desc, def }: { name: string; type: string; required?: boolean; desc: string; def?: string }) {
    return (
        <tr className="border-b border-vox-outline/10 last:border-0">
            <td className="py-3 pr-3 align-top"><code className="text-sm font-mono text-vox-primary bg-vox-primary/10 px-1.5 py-0.5 rounded">{name}</code></td>
            <td className="py-3 pr-3 align-top text-sm text-vox-text-dim font-mono">{type}</td>
            <td className="py-3 pr-3 align-top text-sm">
                {required ? <span className="text-red-400 font-semibold text-xs">Required</span> : <span className="text-vox-text-dim text-xs">Optional</span>}
            </td>
            <td className="py-3 align-top text-sm text-vox-text">
                {desc}
                {def && <span className="text-vox-text-dim ml-1">(default: <code className="text-xs bg-vox-surface px-1 py-0.5 rounded">{def}</code>)</span>}
            </td>
        </tr>
    );
}

export function SectionCard({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className="bg-vox-surface border border-vox-outline/20 rounded-2xl overflow-hidden scroll-mt-24">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-vox-outline/10">
                <div className="w-10 h-10 rounded-xl bg-vox-primary/10 flex items-center justify-center text-vox-primary">{icon}</div>
                <h2 className="text-xl font-bold text-vox-heading">{title}</h2>
            </div>
            <div className="px-6 py-6 space-y-6">{children}</div>
        </section>
    );
}

export function MethodBadge({ method }: { method: string }) {
    const colors: Record<string, string> = {
        GET: "bg-green-500/15 text-green-400 border-green-500/30",
        POST: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        WS: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    };
    return <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${colors[method] || "bg-vox-surface text-vox-text"}`}>{method}</span>;
}

export function EndpointHeader({ method, path, desc }: { method: string; path: string; desc: string }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <MethodBadge method={method} />
                <code className="text-base font-mono font-bold text-vox-heading">{path}</code>
            </div>
            <p className="text-sm text-vox-text-dim">{desc}</p>
            <p className="text-xs text-vox-text-dim">Auth: <code className="bg-vox-surface-low px-1.5 py-0.5 rounded">Authorization: Bearer &lt;VOICE_API_KEY&gt;</code></p>
        </div>
    );
}

export function CollapsibleExample({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-vox-outline/15 rounded-xl overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-vox-heading bg-vox-surface-low hover:bg-vox-surface transition-colors">
                {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {title}
            </button>
            {open && <div className="p-4 space-y-4 border-t border-vox-outline/10">{children}</div>}
        </div>
    );
}

export function InfoBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-vox-primary/5 border border-vox-primary/20 rounded-xl p-4 text-sm">
            {children}
        </div>
    );
}

export function WarningBox({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm">
            <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold text-amber-300 mb-1">{title}</p>
                    <div className="text-vox-text">{children}</div>
                </div>
            </div>
        </div>
    );
}

export function StepList({ steps }: { steps: { title: string; desc: string }[] }) {
    return (
        <div className="space-y-3">
            {steps.map((s, i) => (
                <div key={i} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-vox-primary/15 text-vox-primary flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</div>
                    <div>
                        <p className="text-sm font-semibold text-vox-heading">{s.title}</p>
                        <p className="text-sm text-vox-text-dim">{s.desc}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ParamTable({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead><tr className="border-b border-vox-outline/20 text-xs text-vox-text-dim uppercase">
                    <th className="py-2 pr-3">Param</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Required</th><th className="py-2">Description</th>
                </tr></thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}

export function ErrorTable() {
    const errors = [
        ["INVALID_API_KEY", "401/403", "API key is invalid, revoked, expired, or missing a required scope"],
        ["VOICE_NOT_FOUND", "404", "Voice profile linked to API key was deleted"],
        ["QUOTA_EXCEEDED", "403", "Monthly character quota exceeded — check GET /api/v1/usage"],
        ["BAD_REQUEST", "400", "Missing or invalid parameters in request body"],
        ["TEXT_TOO_LONG", "400", "Input text exceeds 5,000 character limit"],
        ["BACKEND_ERROR", "500", "TTS inference engine failed — retry or check backend logs"],
        ["INTERNAL_ERROR", "500", "Server configuration or unexpected error"],
        ["NOT_FOUND", "404", "Requested resource does not exist"],
    ];
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-vox-outline/20 text-xs text-vox-text-dim uppercase">
                    <th className="py-2 pr-3">Code</th><th className="py-2 pr-3">HTTP</th><th className="py-2">Description</th>
                </tr></thead>
                <tbody className="text-vox-text">
                    {errors.map(([code, http, desc]) => (
                        <tr key={code} className="border-b border-vox-outline/10 last:border-0">
                            <td className="py-2.5 pr-3"><code className="text-xs font-mono text-red-400">{code}</code></td>
                            <td className="py-2.5 pr-3 text-xs font-mono text-vox-text-dim">{http}</td>
                            <td className="py-2.5 text-sm">{desc}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
