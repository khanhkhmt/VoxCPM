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
        <div className="flex flex-col gap-1.5">
            <label className="block text-[11.5px] font-medium tracking-[0.02em] text-vox-text-dim mb-0.5">
                Security Code
            </label>
            <div className="flex items-center gap-2.5 w-full min-w-0">
                {/* Captcha image */}
                <div className="relative h-[42px] w-[124px] min-w-[124px] rounded-lg overflow-hidden bg-vox-surface-high border border-vox-outline/60 shrink-0">
                    {imgSrc ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={imgSrc}
                            alt="Captcha"
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] text-vox-text-dim">
                            Loading…
                        </div>
                    )}
                </div>

                {/* Refresh button */}
                <button
                    type="button"
                    onClick={refresh}
                    className="p-2 rounded-lg bg-vox-surface hover:bg-vox-surface-high text-vox-text-dim hover:text-vox-text transition-colors border border-vox-outline/60 shrink-0"
                    title="Refresh captcha"
                    aria-label="Refresh captcha"
                >
                    <RotateCw size={15} />
                </button>

                {/* Text input */}
                <input
                    type="text"
                    autoComplete="off"
                    placeholder="Enter code"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 min-w-0 bg-vox-bg border border-vox-outline/60 rounded-lg px-3.5 py-2.5 text-[13.5px] text-vox-text outline-none focus:border-vox-outline focus:ring-2 focus:ring-ori-accent/15 transition-all tracking-widest"
                    maxLength={5}
                />
            </div>
            {error && (
                <p className="text-[11px] text-red-500 mt-0.5">{error}</p>
            )}
        </div>
    );
}
