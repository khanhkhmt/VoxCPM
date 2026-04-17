"use client";

import { useState, useCallback } from "react";
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
    const [captchaId, setCaptchaId] = useState(() => crypto.randomUUID());
    const [captchaText, setCaptchaText] = useState("");
    const [loading, setLoading] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(false);

    const {
        register: registerField,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            captchaId: "",
            captchaText: "",
        },
    });

    const regenerateCaptcha = useCallback(() => {
        setCaptchaId(crypto.randomUUID());
        setCaptchaText("");
    }, []);

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
            router.push("/studio");
        } catch (err: unknown) {
            const error = err as Error & { code?: string };
            setServerError(error.message);

            if (error.code === "CAPTCHA_WRONG" || error.code === "CAPTCHA_EXPIRED") {
                regenerateCaptcha();
            }
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

                    <FormField label="Email" error={errors.email?.message}>
                        <TextInput
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            hasError={!!errors.email}
                            {...registerField("email")}
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
                        onChange={setCaptchaText}
                        captchaId={captchaId}
                        onRegenerate={regenerateCaptcha}
                        error={errors.captchaText?.message}
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
