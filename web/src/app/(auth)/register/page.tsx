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
import { AlertTriangle, UserPlus } from "lucide-react";

export default function RegisterPage() {
    const { register: authRegister } = useAuth();
    const router = useRouter();

    const [serverError, setServerError] = useState<string | null>(null);
    const [serverSuccess, setServerSuccess] = useState<string | null>(null);
    const [captchaId, setCaptchaId] = useState("");

    // Generate captchaId only on client to avoid SSR/client hydration mismatch
    useEffect(() => {
        setCaptchaId(crypto.randomUUID());
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
        setCaptchaId(crypto.randomUUID());
        setValue("captchaText", "");
    }, [setValue]);

    const onSubmit = async (data: RegisterInput) => {
        if (!agreedTerms) {
            setServerError("Please agree to the Terms of Service to continue.");
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

            setServerSuccess("Account created successfully! Redirecting to login...");
            setTimeout(() => {
                router.push("/login");
            }, 1500);
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
                    <h1 className="text-2xl font-bold text-white mb-2">
                        Create your account
                    </h1>
                    <p className="text-sm text-vox-text-dim">
                        Sign up to start generating lifelike speech
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
                    <FormField label="Name" error={errors.name?.message}>
                        <TextInput
                            type="text"
                            placeholder="Your name"
                            autoComplete="name"
                            hasError={!!errors.name}
                            {...registerField("name")}
                        />
                    </FormField>

                    <FormField label="Username" error={errors.username?.message}>
                        <TextInput
                            type="text"
                            placeholder="Choose a username"
                            autoComplete="username"
                            hasError={!!errors.username}
                            {...registerField("username")}
                        />
                    </FormField>

                    <FormField label="Password" error={errors.password?.message}>
                        <PasswordInput
                            placeholder="Min 8 chars, 1 upper, 1 lower, 1 digit"
                            autoComplete="new-password"
                            hasError={!!errors.password}
                            {...registerField("password")}
                        />
                    </FormField>

                    <FormField
                        label="Confirm Password"
                        error={errors.confirmPassword?.message}
                    >
                        <PasswordInput
                            placeholder="Re-enter your password"
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
                            I agree to the{" "}
                            <Link href="#" className="text-vox-secondary underline underline-offset-2">
                                Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link href="#" className="text-vox-secondary underline underline-offset-2">
                                Privacy Policy
                            </Link>
                        </span>
                    </label>

                    <SubmitButton loading={loading}>
                        <UserPlus size={18} />
                        Create account
                    </SubmitButton>
                </form>

                <div className="mt-6 text-center text-sm text-vox-text-dim">
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="text-vox-secondary hover:text-white transition-colors font-medium"
                    >
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
