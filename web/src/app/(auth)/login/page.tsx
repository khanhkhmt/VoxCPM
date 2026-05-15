"use client";

import { Suspense } from "react";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { useAuth } from "@/lib/auth";
import { FormField, TextInput, PasswordInput, SubmitButton } from "@/components/auth/AuthForm";
import CaptchaField from "@/components/auth/CaptchaField";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { AlertTriangle, LogIn } from "lucide-react";
import { generateId } from "@/lib/utils";
import { getGoogleAuthErrorMessage } from "@/lib/auth/google-errors";
import { useI18n } from "@/i18n";

function AuthTabs() {
    const pathname = usePathname();
    const isLogin = pathname?.startsWith("/login");
    const { t } = useI18n();
    return (
        <div className="flex gap-0 bg-vox-surface-high border border-vox-outline/60 rounded-[10px] p-[3px] mb-7">
            <Link
                href="/login"
                className={`flex-1 text-center rounded-lg py-2 text-[13px] font-medium transition-all ${
                    isLogin
                        ? "bg-vox-surface text-vox-text shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                        : "text-vox-text-dim hover:text-vox-text"
                }`}
            >
                {t.common.signIn}
            </Link>
            <Link
                href="/register"
                className={`flex-1 text-center rounded-lg py-2 text-[13px] font-medium transition-all ${
                    !isLogin
                        ? "bg-vox-surface text-vox-text shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                        : "text-vox-text-dim hover:text-vox-text"
                }`}
            >
                {t.common.signUp}
            </Link>
        </div>
    );
}

function LoginForm() {
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useI18n();
    const next = searchParams.get("next") ?? "/studio";
    const oauthErrorCode = searchParams.get("error");
    const oauthErrorMessage = getGoogleAuthErrorMessage(oauthErrorCode);

    const [serverError, setServerError] = useState<string | null>(oauthErrorMessage);
    const [captchaId, setCaptchaId] = useState("");

    // Generate captchaId only on client to avoid SSR/client hydration mismatch
    useEffect(() => {
        setCaptchaId(generateId());
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
        setCaptchaId(generateId());
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
        <div className="w-full">
            <AuthTabs />

            <h1 className="text-[22px] font-bold text-vox-heading tracking-tight mb-1.5">
                {t.auth.login.title}
            </h1>
            <p className="text-[13px] text-vox-text-dim leading-relaxed mb-6">
                {t.auth.noAccount}{" "}
                <Link
                    href="/register"
                    className="font-medium text-vox-text border-b border-vox-outline hover:border-vox-text transition-colors"
                >
                    {t.auth.createAccount}
                </Link>
            </p>

            {serverError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-200 p-3 rounded-lg text-[12.5px] flex items-start gap-2">
                    <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <p>{serverError}</p>
                </div>
            )}

            <GoogleSignInButton
                label={t.common.signInWithGoogle}
                next={next === "/studio" ? null : next}
            />

            <div className="flex items-center gap-2.5 my-4">
                <div className="flex-1 h-px bg-vox-outline/50" />
                <span className="text-[11px] text-vox-text-dim/70 whitespace-nowrap">
                    {t.common.orContinueWith}
                </span>
                <div className="flex-1 h-px bg-vox-outline/50" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
                <FormField label={t.auth.username} error={errors.username?.message}>
                    <TextInput
                        type="text"
                        placeholder={t.auth.enterUsername}
                        autoComplete="username"
                        hasError={!!errors.username}
                        {...registerField("username")}
                    />
                </FormField>

                <FormField label={t.auth.password} error={errors.password?.message}>
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

                <div className="pt-1">
                    <SubmitButton loading={loading}>
                        <LogIn size={16} />
                        {t.common.signIn}
                    </SubmitButton>
                </div>
            </form>

            <p className="text-[11px] text-vox-text-dim/70 text-center leading-[1.7] mt-3.5">
                {t.auth.register.agreeToTerms}{" "}
                <Link href="#" className="text-vox-text-dim underline underline-offset-2">
                    {t.auth.register.termsOfService}
                </Link>{" "}
                {t.auth.register.and}{" "}
                <Link href="#" className="text-vox-text-dim underline underline-offset-2">
                    {t.auth.register.privacyPolicy}
                </Link>
                .
            </p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="w-full max-w-md p-8 text-center text-vox-text-dim">
                    Loading...
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
