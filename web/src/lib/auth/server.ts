import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const JWT_SECRET_RAW = process.env.AUTH_JWT_SECRET || "dev-secret-CHANGE-ME-in-production-please";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const SESSION_COOKIE = "voxora_session";
const SESSION_MAX_AGE = 12 * 60 * 60; // 12 hours in seconds

export interface SessionPayload extends JWTPayload {
    userId: string;
    sessionId: string;
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------
export async function signSessionToken(payload: {
    userId: string;
    sessionId: string;
}): Promise<string> {
    return new SignJWT({ userId: payload.userId, sessionId: payload.sessionId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_MAX_AGE}s`)
        .sign(JWT_SECRET);
}

export async function verifySessionToken(
    token: string,
): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as SessionPayload;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------
export async function setSessionCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
    });
}

export async function clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

// ---------------------------------------------------------------------------
// SHA-256 helper for storing token hash
// ---------------------------------------------------------------------------
export async function sha256(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Get current user from cookie
// ---------------------------------------------------------------------------
export async function getCurrentUser() {
    const token = await getSessionToken();
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

    try {
        const session = await prisma.session.findUnique({
            where: { id: payload.sessionId },
            include: { user: true },
        });

        if (!session) return null;
        if (session.expiresAt < new Date()) {
            // Expired session — clean up
            await prisma.session.delete({ where: { id: session.id } });
            return null;
        }

        const { user } = session;
        return {
            id: user.id,
            username: user.username,
            name: user.name,
            avatarUrl: user.avatarUrl,
            role: user.role as "user" | "admin",
        };
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Create session + set cookie
// ---------------------------------------------------------------------------
export async function createSessionAndSetCookie(
    userId: string,
): Promise<void> {
    const headerStore = await headers();
    const userAgent = headerStore.get("user-agent") ?? undefined;
    const ip =
        headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headerStore.get("x-real-ip") ??
        undefined;

    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

    // Create a temporary session to get the ID
    const session = await prisma.session.create({
        data: {
            userId,
            tokenHash: "pending", // Will be updated after signing
            userAgent,
            ip,
            expiresAt,
        },
    });

    const token = await signSessionToken({
        userId,
        sessionId: session.id,
    });

    const tokenHash = await sha256(token);

    await prisma.session.update({
        where: { id: session.id },
        data: { tokenHash },
    });

    await setSessionCookie(token);
}

// ---------------------------------------------------------------------------
// Revoke current session
// ---------------------------------------------------------------------------
export async function revokeCurrentSession(): Promise<void> {
    const token = await getSessionToken();
    if (!token) return;

    const payload = await verifySessionToken(token);
    if (!payload) return;

    try {
        await prisma.session.delete({ where: { id: payload.sessionId } });
    } catch {
        // Already deleted or doesn't exist
    }

    await clearSessionCookie();
}
