"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, forwardRef } from "react";

// ---------------------------------------------------------------------------
// FormField — wraps label + input + error
// ---------------------------------------------------------------------------
interface FormFieldProps {
    label: string;
    error?: string;
    children: React.ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="block text-[11.5px] font-medium tracking-[0.02em] text-vox-text-dim mb-0.5">
                {label}
            </label>
            {children}
            {error && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Shared input class
// ---------------------------------------------------------------------------
const baseInputCls =
    "w-full bg-vox-bg border rounded-lg px-3.5 py-2.5 text-[13.5px] text-vox-text outline-none transition-all placeholder:text-vox-text-dim/60";

// ---------------------------------------------------------------------------
// TextInput
// ---------------------------------------------------------------------------
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    hasError?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
    function TextInput({ hasError, className, ...props }, ref) {
        return (
            <input
                ref={ref}
                className={`${baseInputCls} ${
                    hasError
                        ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-vox-outline/60 focus:border-vox-outline focus:ring-2 focus:ring-ori-accent/15"
                } ${className ?? ""}`}
                {...props}
            />
        );
    },
);

// ---------------------------------------------------------------------------
// PasswordInput — text input with show/hide toggle
// ---------------------------------------------------------------------------
interface PasswordInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    hasError?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    function PasswordInput({ hasError, className, ...props }, ref) {
        const [show, setShow] = useState(false);

        return (
            <div className="relative">
                <input
                    ref={ref}
                    type={show ? "text" : "password"}
                    className={`${baseInputCls} pr-10 ${
                        hasError
                            ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                            : "border-vox-outline/60 focus:border-vox-outline focus:ring-2 focus:ring-ori-accent/15"
                    } ${className ?? ""}`}
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-vox-text-dim hover:text-vox-text transition-colors"
                    tabIndex={-1}
                    aria-label={show ? "Hide password" : "Show password"}
                >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
        );
    },
);

// ---------------------------------------------------------------------------
// SubmitButton — primary near-black action button (Oriagent style)
// ---------------------------------------------------------------------------
interface SubmitButtonProps {
    loading?: boolean;
    children: React.ReactNode;
}

export function SubmitButton({ loading, children }: SubmitButtonProps) {
    return (
        <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13.5px] font-semibold tracking-[0.01em] transition-all shadow-[0_1px_4px_rgba(0,0,0,0.12)] ${
                loading
                    ? "bg-vox-surface-high text-vox-text-dim cursor-wait"
                    : "bg-ori-ink text-white hover:opacity-90 hover:-translate-y-px active:translate-y-0 active:scale-[0.995]"
            }`}
        >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {children}
        </button>
    );
}
