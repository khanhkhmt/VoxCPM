"use client";

import { RotateCw } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

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

    const imgSrc = captchaId
        ? `/api/auth/captcha?uuid=${captchaId}&t=${timestamp}`
        : "";

    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-vox-text">
                Security Code
            </label>
            <div className="flex items-center gap-3 w-full min-w-0">
                {/* Captcha image */}
                <div className="relative h-[44px] w-[140px] min-w-[140px] rounded-lg overflow-hidden bg-gray-900 border border-vox-outline/30 shrink-0">
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
