"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { useAuth } from "@/lib/auth";
import { FormField, TextInput, PasswordInput, SubmitButton } from "@/components/auth/AuthForm";
import CaptchaField from "@/components/auth/CaptchaField";
import { AlertTriangle, LogIn } from "lucide-react";

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") ?? "/studio";

    const [serverError, setServerError] = useState<string | null>(null);
    const [captchaId, setCaptchaId] = useState("");

    // Generate captchaId only on client to avoid SSR/client hydration mismatch
    useEffect(() => {
        setCaptchaId(crypto.randomUUID());
    }, []);
    const [loading, setLoading] = useState(false);

    const {
        register: registerField,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: { username: "", password: "", captchaId: "", captchaText: "" },
    });

    const captchaText = watch("captchaText");

    // Keep react-hook-form in sync with the captchaId state
    useEffect(() => {
        setValue("captchaId", captchaId);
    }, [captchaId, setValue]);

    const regenerateCaptcha = useCallback(() => {
        setCaptchaId(crypto.randomUUID());
        setValue("captchaText", "");
    }, [setValue]);

    const onSubmit = async (data: LoginInput) => {
        setServerError(null);
        setLoading(true);

        try {
            await login({
                ...data,
                captchaId,
                captchaText,
            });
            router.push(next);
        } catch (err: unknown) {
            const error = err as Error & { code?: string };
            setServerError(error.message);

            // Auto-refresh captcha on any API error because the backend token is consumed
            regenerateCaptcha();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            <div className="glass-panel rounded-2xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
                    <p className="text-sm text-vox-text-dim">
                        Sign in to your account to continue
                    </p>
                </div>

                {serverError && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-xl text-sm flex items-start gap-2">
                        <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                        <p>{serverError}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                    <FormField label="Username" error={errors.username?.message}>
                        <TextInput
                            type="text"
                            placeholder="Enter your username"
                            autoComplete="username"
                            hasError={!!errors.username}
                            {...registerField("username")}
                        />
                    </FormField>

                    <FormField label="Password" error={errors.password?.message}>
                        <PasswordInput
                            placeholder="••••••••"
                            autoComplete="current-password"
                            hasError={!!errors.password}
                            {...registerField("password")}
                        />
                    </FormField>

                    <CaptchaField
                        value={captchaText}
                        onChange={(val) => setValue("captchaText", val, { shouldValidate: true })}
                        captchaId={captchaId}
                        onRegenerate={regenerateCaptcha}
                        error={errors.captchaText?.message || errors.captchaId?.message}
                    />

                    <SubmitButton loading={loading}>
                        <LogIn size={18} />
                        Sign in
                    </SubmitButton>
                </form>

                <div className="mt-6 text-center text-sm text-vox-text-dim">
                    Don&apos;t have an account?{" "}
                    <Link
                        href="/register"
                        className="text-vox-secondary hover:text-white transition-colors font-medium"
                    >
                        Create account
                    </Link>
                </div>
            </div>
        </div>
    );
}
