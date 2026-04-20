import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/schemas/auth";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { hashPassword } from "@/lib/auth/hash";
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
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return NextResponse.json(
            { ok: false, error: { code: "VALIDATION_ERROR", message: firstError?.message ?? "Validation failed" } },
            { status: 400 },
        );
    }

    const { username, name, password, captchaId, captchaText } = parsed.data;

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

    // -- Database operations (wrapped in try-catch for proper JSON errors) --
    try {
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

        // Check username unique
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return NextResponse.json(
                { ok: false, error: { code: "USERNAME_ALREADY_EXISTS", message: "This username is already taken." } },
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
                username,
                name,
                passwordHash,
                role,
            },
        });

        // (Optional) We intentionally don't create the session cookie here 
        // so the user is forced to log in manually according to standard UX flows.

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
        console.error("Register DB error:", err);
        return NextResponse.json(
            { ok: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred. Please try again." } },
            { status: 500 },
        );
    }
}
