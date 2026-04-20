import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas/auth";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { verifyPassword } from "@/lib/auth/hash";
import { createSessionAndSetCookie } from "@/lib/auth/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return NextResponse.json(
            { ok: false, error: { code: "VALIDATION_ERROR", message: firstError?.message ?? "Validation failed" } },
            { status: 400 },
        );
    }

    const { username, password, captchaId, captchaText } = parsed.data;

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

    // -- Database operations --
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !user.isActive) {
            return NextResponse.json(
                { ok: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password." } },
                { status: 401 },
            );
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
            return NextResponse.json(
                { ok: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password." } },
                { status: 401 },
            );
        }

        await createSessionAndSetCookie(user.id);

        return NextResponse.json({
            ok: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                    role: user.role,
                },
            },
        });
    } catch (err: unknown) {
        console.error("Login DB error:", err);
        return NextResponse.json(
            { ok: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred. Please try again." } },
            { status: 500 },
        );
    }
}
