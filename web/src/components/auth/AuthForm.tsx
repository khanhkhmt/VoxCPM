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
            <label className="text-sm font-medium text-vox-text">{label}</label>
            {children}
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

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
                className={`w-full bg-vox-surface-lowest border rounded-lg px-4 py-2.5 text-sm text-vox-text outline-none transition-colors ${hasError
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-vox-outline/30 focus:border-vox-primary"
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
                    className={`w-full bg-vox-surface-lowest border rounded-lg px-4 py-2.5 pr-10 text-sm text-vox-text outline-none transition-colors ${hasError
                            ? "border-red-500/50 focus:border-red-500"
                            : "border-vox-outline/30 focus:border-vox-primary"
                        } ${className ?? ""}`}
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-vox-text-dim hover:text-vox-text transition-colors"
                    tabIndex={-1}
                >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        );
    },
);

// ---------------------------------------------------------------------------
// SubmitButton
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
            className={`w-full relative group overflow-hidden rounded-xl font-semibold px-6 py-3 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] ${loading
                    ? "bg-vox-surface-high text-vox-text-dim cursor-wait"
                    : "bg-vox-primary text-white hover:shadow-[0_0_30px_rgba(124,58,237,0.6)]"
                }`}
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
                {loading && <Loader2 size={18} className="animate-spin" />}
                {children}
            </span>
            {!loading && (
                <div className="absolute inset-0 bg-gradient-to-r from-vox-primary to-vox-secondary opacity-0 group-hover:opacity-100 transition-opacity z-0" />
            )}
        </button>
    );
}
