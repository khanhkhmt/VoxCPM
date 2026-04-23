"use client";

import { RotateCw } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/lib/theme";

interface CaptchaFieldProps {
    value: string;
    onChange: (value: string) => void;
    captchaId: string;
    onRegenerate: () => void;
    error?: string;
}

export default function CaptchaField({
    value,
    onChange,
    captchaId,
    onRegenerate,
    error,
}: CaptchaFieldProps) {
    const { theme } = useTheme();
    const [timestamp, setTimestamp] = useState<number>(0);

    const refresh = useCallback(() => {
        onRegenerate();
        setTimestamp(Date.now());
        onChange("");
    }, [onRegenerate, onChange]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTimestamp(Date.now());
    }, [captchaId]);

    // Regenerate captcha when theme changes so the background matches
    useEffect(() => {
        if (captchaId) {
            refresh();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme]);

    const imgSrc = captchaId
        ? `/api/auth/captcha?uuid=${captchaId}&theme=${theme}&t=${timestamp}`
        : "";

    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-vox-text">
                Security Code
            </label>
            <div className="flex items-center gap-3 w-full min-w-0">
                {/* Captcha image */}
                <div className="relative h-[44px] w-[140px] min-w-[140px] rounded-lg overflow-hidden bg-vox-surface-highest border border-vox-outline/30 shrink-0">
                    {imgSrc ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={imgSrc}
                            alt="Captcha"
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-vox-text-dim">
                            Loading…
                        </div>
                    )}
                </div>

                {/* Refresh button */}
                <button
                    type="button"
                    onClick={refresh}
                    className="p-2 rounded-lg bg-vox-surface hover:bg-vox-surface-high text-vox-text-dim hover:text-vox-secondary transition-colors border border-vox-outline/20 shrink-0"
                    title="Refresh captcha"
                >
                    <RotateCw size={16} />
                </button>

                {/* Text input */}
                <input
                    type="text"
                    autoComplete="off"
                    placeholder="Enter code"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 min-w-0 bg-vox-surface-lowest border border-vox-outline/30 rounded-lg px-4 py-2.5 text-sm text-vox-text outline-none focus:border-vox-primary transition-colors tracking-widest"
                    maxLength={5}
                />
            </div>
            {error && (
                <p className="text-xs text-red-400 mt-0.5">{error}</p>
            )}
        </div>
    );
}
