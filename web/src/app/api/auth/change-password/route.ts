import { NextRequest, NextResponse } from "next/server";
import { changePasswordSchema } from "@/lib/schemas/auth";
import { verifyPassword, hashPassword } from "@/lib/auth/hash";
import {
    getCurrentUser,
    getSessionToken,
    verifySessionToken,
} from "@/lib/auth/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    // Check auth
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json(
            { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } },
            { status: 401 },
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
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return NextResponse.json(
            { ok: false, error: { code: "VALIDATION_ERROR", message: firstError?.message ?? "Validation failed" } },
            { status: 400 },
        );
    }

    const { currentPassword, newPassword } = parsed.data;

    // Get full user with password hash
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
        return NextResponse.json(
            { ok: false, error: { code: "UNAUTHORIZED", message: "User not found." } },
            { status: 401 },
        );
    }

    // Verify current password
    const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!valid) {
        return NextResponse.json(
            { ok: false, error: { code: "INVALID_CREDENTIALS", message: "Current password is incorrect." } },
            { status: 400 },
        );
    }

    // Hash new password
    const newHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
    });

    // Revoke all OTHER sessions (keep current one)
    const token = await getSessionToken();
    const payload = token ? await verifySessionToken(token) : null;

    if (payload) {
        await prisma.session.deleteMany({
            where: {
                userId: user.id,
                id: { not: payload.sessionId },
            },
        });
    }

    return NextResponse.json({ ok: true });
}
