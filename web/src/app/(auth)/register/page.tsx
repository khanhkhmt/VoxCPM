"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth";
import { useAuth } from "@/lib/auth";
import { FormField, TextInput, PasswordInput, SubmitButton } from "@/components/auth/AuthForm";
import CaptchaField from "@/components/auth/CaptchaField";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { AlertTriangle, UserPlus } from "lucide-react";
import { generateId } from "@/lib/utils";
import { useI18n } from "@/i18n";

export default function RegisterPage() {
    const { register: authRegister } = useAuth();
    const router = useRouter();
    const { t } = useI18n();

    const [serverError, setServerError] = useState<string | null>(null);
    const [serverSuccess, setServerSuccess] = useState<string | null>(null);
    const [captchaId, setCaptchaId] = useState("");

    // Generate captchaId only on client to avoid SSR/client hydration mismatch
    useEffect(() => {
        setCaptchaId(generateId());
    }, []);
    const [loading, setLoading] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(false);

    const {
        register: registerField,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            username: "",
            password: "",
            confirmPassword: "",
            captchaId: "",
            captchaText: "",
        },
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

    const onSubmit = async (data: RegisterInput) => {
        if (!agreedTerms) {
            setServerError(t.auth.register.agreeError);
            return;
        }

        setServerError(null);
        setLoading(true);

        try {
            await authRegister({
                ...data,
                captchaId,
                captchaText,
            });

            setServerSuccess(t.auth.register.accountCreated);
            router.push("/studio");
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
                    <h1 className="text-2xl font-bold text-vox-heading mb-2">
                        {t.auth.register.title}
                    </h1>
                    <p className="text-sm text-vox-text-dim">
                        {t.auth.register.subtitle}
                    </p>
                </div>

                {serverError && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-xl text-sm flex items-start gap-2">
                        <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                        <p>{serverError}</p>
                    </div>
                )}

                {serverSuccess && (
                    <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-200 p-3 rounded-xl text-sm flex items-start gap-2">
                        <UserPlus size={16} className="text-green-400 mt-0.5 shrink-0" />
                        <p>{serverSuccess}</p>
                    </div>
                )}



                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                    <FormField label={t.auth.name} error={errors.name?.message}>
                        <TextInput
                            type="text"
                            placeholder={t.auth.yourName}
                            autoComplete="name"
                            hasError={!!errors.name}
                            {...registerField("name")}
                        />
                    </FormField>

                    <FormField label={t.auth.username} error={errors.username?.message}>
                        <TextInput
                            type="text"
                            placeholder={t.auth.chooseUsername}
                            autoComplete="username"
                            hasError={!!errors.username}
                            {...registerField("username")}
                        />
                    </FormField>

                    <FormField label={t.auth.password} error={errors.password?.message}>
                        <PasswordInput
                            placeholder={t.auth.passwordHint}
                            autoComplete="new-password"
                            hasError={!!errors.password}
                            {...registerField("password")}
                        />
                    </FormField>

                    <FormField
                        label={t.auth.confirmPassword}
                        error={errors.confirmPassword?.message}
                    >
                        <PasswordInput
                            placeholder={t.auth.reenterPassword}
                            autoComplete="new-password"
                            hasError={!!errors.confirmPassword}
                            {...registerField("confirmPassword")}
                        />
                    </FormField>

                    <CaptchaField
                        value={captchaText}
                        onChange={(val) => setValue("captchaText", val, { shouldValidate: true })}
                        captchaId={captchaId}
                        onRegenerate={regenerateCaptcha}
                        error={errors.captchaText?.message || errors.captchaId?.message}
                    />

                    {/* Terms checkbox */}
                    <label className="flex items-start gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={agreedTerms}
                            onChange={(e) => setAgreedTerms(e.target.checked)}
                            className="mt-1 accent-vox-primary"
                        />
                        <span className="text-xs text-vox-text-dim group-hover:text-vox-text transition-colors">
                            {t.auth.register.agreeToTerms}{" "}
                            <Link href="#" className="text-vox-secondary underline underline-offset-2">
                                {t.auth.register.termsOfService}
                            </Link>{" "}
                            {t.auth.register.and}{" "}
                            <Link href="#" className="text-vox-secondary underline underline-offset-2">
                                {t.auth.register.privacyPolicy}
                            </Link>
                        </span>
                    </label>

                    <SubmitButton loading={loading}>
                        <UserPlus size={18} />
                        {t.auth.createAccount}
                    </SubmitButton>
                </form>

                <div className="mt-6 flex flex-col gap-3">
                    <div className="flex items-center gap-3 text-xs text-vox-text-dim">
                        <div className="flex-1 h-px bg-vox-outline/30" />
                        <span>{t.common.orContinueWith}</span>
                        <div className="flex-1 h-px bg-vox-outline/30" />
                    </div>
                    <GoogleSignInButton label={t.common.signUpWithGoogle} />
                </div>

                <div className="mt-6 text-center text-sm text-vox-text-dim">
                    {t.auth.haveAccount}{" "}
                    <Link
                        href="/login"
                        className="text-vox-secondary hover:text-vox-heading transition-colors font-medium"
                    >
                        {t.common.signIn}
                    </Link>
                </div>
            </div>
        </div>
    );
}
