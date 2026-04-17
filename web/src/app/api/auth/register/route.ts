import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/schemas/auth";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { hashPassword } from "@/lib/auth/hash";
import { createSessionAndSetCookie } from "@/lib/auth/server";
import { registerLimiter } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    // Rate-limit by IP
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";
    const rateLimitResult = await registerLimiter.limit(`register:${ip}`);
    if (!rateLimitResult.success) {
        return NextResponse.json(
            { ok: false, error: { code: "RATE_LIMITED", message: "Too many registration attempts. Please try again later." } },
            { status: 429 },
        );
    }

    // Parse body
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
            { status: 400 },
        );
    }

    // Validate
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return NextResponse.json(
            { ok: false, error: { code: "VALIDATION_ERROR", message: firstError?.message ?? "Validation failed" } },
            { status: 400 },
        );
    }

    const { email, name, password, captchaId, captchaText } = parsed.data;

    // Verify captcha
    const captchaResult = await verifyCaptcha(captchaId, captchaText);
    if (!captchaResult.ok) {
        return NextResponse.json(
            {
                ok: false,
                error: {
                    code: captchaResult.code!,
                    message: captchaResult.code === "CAPTCHA_EXPIRED"
                        ? "Captcha expired. Please refresh and try again."
                        : "Incorrect captcha. Please try again.",
                },
            },
            { status: 400 },
        );
    }

    // Check if registration is allowed
    const userCount = await prisma.user.count();
    const allowRegister = process.env.AUTH_ALLOW_REGISTER !== "false";

    // First user is always allowed (bootstrap admin)
    if (!allowRegister && userCount > 0) {
        return NextResponse.json(
            { ok: false, error: { code: "REGISTER_DISABLED", message: "Registration is currently disabled." } },
            { status: 403 },
        );
    }

    // Check email unique
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return NextResponse.json(
            { ok: false, error: { code: "EMAIL_ALREADY_EXISTS", message: "An account with this email already exists." } },
            { status: 409 },
        );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // First user auto = admin
    const role = userCount === 0 ? "admin" : "user";

    // Create user
    const user = await prisma.user.create({
        data: {
            email,
            name,
            passwordHash,
            role,
        },
    });

    // Create session + set cookie
    await createSessionAndSetCookie(user.id);

    return NextResponse.json({
        ok: true,
        data: {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                role: user.role,
            },
        },
    });
}
