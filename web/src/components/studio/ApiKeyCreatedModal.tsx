"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Copy,
    Check,
    AlertTriangle,
    Play,
    BookOpen,
    X,
    Shield,
} from "lucide-react";

interface ApiKeyCreatedModalProps {
    voiceName: string;
    plainKey: string;
    onClose: () => void;
}

export default function ApiKeyCreatedModal({
    voiceName,
    plainKey,
    onClose,
}: ApiKeyCreatedModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(plainKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-vox-surface border border-vox-outline/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-vox-outline/10">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface-low transition-colors"
                    >
                        <X size={18} />
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                            <Shield size={22} className="text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-vox-heading">
                                API Key Created
                            </h2>
                            <p className="text-sm text-vox-text-dim">
                                Linked to voice:{" "}
                                <span className="font-semibold text-vox-secondary">
                                    {voiceName}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">
                    {/* Warning */}
                    <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl p-4">
                        <AlertTriangle
                            size={18}
                            className="text-amber-400 shrink-0 mt-0.5"
                        />
                        <div className="text-sm">
                            <p className="font-semibold text-amber-300 mb-0.5">
                                Save this key now. You will not be able to see it again.
                            </p>
                            <p className="text-vox-text-dim">
                                For security, we only store a hash of your key. Copy it and keep
                                it somewhere safe.
                            </p>
                        </div>
                    </div>

                    {/* Key Display */}
                    <div>
                        <label className="block text-xs font-bold text-vox-text-dim uppercase tracking-wider mb-2">
                            Your API Key
                        </label>
                        <div className="flex items-center gap-2 bg-vox-surface-low border border-vox-outline/20 rounded-xl p-3">
                            <code className="flex-1 font-mono text-sm text-vox-heading break-all select-all leading-relaxed">
                                {plainKey}
                            </code>
                            <button
                                onClick={handleCopy}
                                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    copied
                                        ? "bg-emerald-500/15 text-emerald-400"
                                        : "bg-vox-primary/10 text-vox-primary hover:bg-vox-primary/20"
                                }`}
                            >
                                {copied ? (
                                    <>
                                        <Check size={14} /> Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} /> Copy
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-vox-surface-low/50 border border-vox-outline/10 rounded-xl p-4 space-y-2 text-sm text-vox-text-dim">
                        <p>
                            Use this API key to generate speech with the voice{" "}
                            <strong className="text-vox-heading">{voiceName}</strong>.
                        </p>
                        <p>
                            You do not need to pass{" "}
                            <code className="text-xs bg-vox-surface px-1 py-0.5 rounded font-mono">
                                voice_id
                            </code>{" "}
                            in your requests. The server automatically detects the voice from the
                            API key.
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-vox-primary text-white font-semibold rounded-xl hover:bg-vox-primary/90 transition-colors text-sm"
                    >
                        <Copy size={16} /> Copy API Key
                    </button>
                    <Link
                        href="/studio/playground"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-vox-surface-low border border-vox-outline/20 text-vox-heading font-semibold rounded-xl hover:bg-vox-surface-high transition-colors text-sm"
                    >
                        <Play size={16} /> Open Playground
                    </Link>
                    <Link
                        href="/studio/api-docs"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-vox-surface-low border border-vox-outline/20 text-vox-text-dim font-semibold rounded-xl hover:bg-vox-surface-high hover:text-vox-heading transition-colors text-sm"
                    >
                        <BookOpen size={16} /> Docs
                    </Link>
                </div>
            </div>
        </div>
    );
}
