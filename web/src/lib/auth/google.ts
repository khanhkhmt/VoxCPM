import { prisma } from "@/lib/db";
import { API_BASE_URL } from "@/lib/config";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export const GOOGLE_PROVIDER = "google";
export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_OAUTH_NEXT_COOKIE = "google_oauth_next";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";

const DEFAULT_AVATAR: string | null = null;

export type GoogleProfile = {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
};

export type GoogleTokenResponse = {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token?: string;
    refresh_token?: string;
};

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------
function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export function getGoogleClientId(): string {
    return requireEnv("GOOGLE_CLIENT_ID");
}

export function getGoogleClientSecret(): string {
    return requireEnv("GOOGLE_CLIENT_SECRET");
}

export function getGoogleRedirectUri(): string {
    return requireEnv("GOOGLE_REDIRECT_URI");
}

export function isGoogleOAuthConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

// ---------------------------------------------------------------------------
// Origin resolution for in-app redirects.
//
// Next.js's `request.url` reflects the host the server was bound to, which may
// differ from the user-facing host (e.g. `next dev -H 0.0.0.0` makes
// `request.url` use `0.0.0.0` even when the browser is on `localhost`).
// Cookies set on `localhost` won't be sent with a redirect to `0.0.0.0`, so we
// must redirect using the same origin the browser actually used.
//
// Priority: APP_URL env var → forwarded headers → Host header → request.url.
// ---------------------------------------------------------------------------
export function resolveRequestOrigin(request: Request): string {
    const appUrl = process.env.APP_URL;
    if (appUrl) {
        try {
            return new URL(appUrl).origin;
        } catch {
            // ignore malformed APP_URL
        }
    }
    const headers = request.headers;
    const forwardedHost = headers.get("x-forwarded-host");
    const forwardedProto = headers.get("x-forwarded-proto");
    const host = forwardedHost ?? headers.get("host");
    if (host) {
        const proto = forwardedProto ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
        return `${proto}://${host}`;
    }
    try {
        return new URL(request.url).origin;
    } catch {
        return API_BASE_URL;
    }
}

// ---------------------------------------------------------------------------
// State / random
// ---------------------------------------------------------------------------
export function generateOAuthState(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Build authorization URL
// ---------------------------------------------------------------------------
export function buildGoogleAuthUrl(state: string): string {
    const params = new URLSearchParams({
        client_id: getGoogleClientId(),
        redirect_uri: getGoogleRedirectUri(),
        response_type: "code",
        scope: "openid email profile",
        state,
        access_type: "online",
        prompt: "select_account",
        include_granted_scopes: "true",
    });
    return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------
export async function exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
        code,
        client_id: getGoogleClientId(),
        client_secret: getGoogleClientSecret(),
        redirect_uri: getGoogleRedirectUri(),
        grant_type: "authorization_code",
    });

    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        // Do not log full body to avoid leaking client_secret echo in some cases.
        console.error("[google-oauth] Token exchange failed:", res.status, text.slice(0, 200));
        throw new Error("google_token_exchange_failed");
    }

    return (await res.json()) as GoogleTokenResponse;
}

// ---------------------------------------------------------------------------
// Userinfo
// ---------------------------------------------------------------------------
export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
    const res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[google-oauth] Userinfo failed:", res.status, text.slice(0, 200));
        throw new Error("google_profile_failed");
    }

    const data = (await res.json()) as Record<string, unknown>;
    const profile: GoogleProfile = {
        sub: String(data.sub ?? ""),
        email: typeof data.email === "string" ? data.email : undefined,
        email_verified: data.email_verified === true || data.email_verified === "true",
        name: typeof data.name === "string" ? data.name : undefined,
        picture: typeof data.picture === "string" ? data.picture : undefined,
    };

    if (!profile.sub) {
        throw new Error("google_profile_failed");
    }

    return profile;
}

// ---------------------------------------------------------------------------
// Username generation — derive a slug from email local-part, ensure unique
// ---------------------------------------------------------------------------
function slugifyUsername(seed: string): string {
    const cleaned = seed
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 24);
    return cleaned || "user";
}

async function generateUniqueUsername(seed: string): Promise<string> {
    const base = slugifyUsername(seed);

    // Quick path: base is free
    const existing = await prisma.user.findUnique({ where: { username: base } });
    if (!existing) return base;

    // Try base_2, base_3, … up to base_50
    for (let i = 2; i <= 50; i++) {
        const candidate = `${base}_${i}`;
        const taken = await prisma.user.findUnique({ where: { username: candidate } });
        if (!taken) return candidate;
    }

    // Fallback: append 5 random hex chars
    for (let i = 0; i < 5; i++) {
        const rnd = Array.from(crypto.getRandomValues(new Uint8Array(3)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        const candidate = `${base}_${rnd}`;
        const taken = await prisma.user.findUnique({ where: { username: candidate } });
        if (!taken) return candidate;
    }

    throw new Error("Failed to generate unique username");
}

// ---------------------------------------------------------------------------
// Find or create user from a verified Google profile
// ---------------------------------------------------------------------------
export type FindOrCreateResult = {
    userId: string;
    created: boolean;
    linked: boolean;
};

export async function findOrCreateGoogleUser(profile: GoogleProfile): Promise<FindOrCreateResult> {
    // 1) Existing OAuthAccount linked to provider+sub
    const existingLink = await prisma.oAuthAccount.findUnique({
        where: {
            provider_providerUserId: {
                provider: GOOGLE_PROVIDER,
                providerUserId: profile.sub,
            },
        },
    });

    if (existingLink) {
        // Optional: refresh email field on the link record if changed.
        if (profile.email && existingLink.email !== profile.email) {
            await prisma.oAuthAccount.update({
                where: { id: existingLink.id },
                data: { email: profile.email },
            }).catch(() => undefined);
        }
        return { userId: existingLink.userId, created: false, linked: false };
    }

    const email = profile.email ?? null;

    // 2) Same-email user exists → link
    if (email) {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            try {
                await prisma.oAuthAccount.create({
                    data: {
                        userId: existingUser.id,
                        provider: GOOGLE_PROVIDER,
                        providerUserId: profile.sub,
                        email,
                    },
                });
            } catch (err: unknown) {
                // If another concurrent callback won the race, fall through to lookup
                if (!(err instanceof Error && err.message.includes("Unique"))) {
                    throw err;
                }
            }
            // Patch missing avatar/name once, but never overwrite existing values
            const patch: Record<string, string> = {};
            if (!existingUser.avatarUrl && profile.picture) patch.avatarUrl = profile.picture;
            if (Object.keys(patch).length > 0) {
                await prisma.user.update({ where: { id: existingUser.id }, data: patch }).catch(() => undefined);
            }
            return { userId: existingUser.id, created: false, linked: true };
        }
    }

    // 3) Create new user + link
    const usernameSeed = email ? email.split("@")[0] : `google_${profile.sub.slice(-6)}`;
    const username = await generateUniqueUsername(usernameSeed);

    const created = await prisma.user.create({
        data: {
            username,
            email,
            name: profile.name?.trim() || username,
            passwordHash: null,
            avatarUrl: profile.picture ?? DEFAULT_AVATAR,
            role: "user",
            oauthAccounts: {
                create: {
                    provider: GOOGLE_PROVIDER,
                    providerUserId: profile.sub,
                    email,
                },
            },
        },
    });

    return { userId: created.id, created: true, linked: false };
}

// ---------------------------------------------------------------------------
// Safe "next" redirect helper — only allow relative paths starting with "/"
// and reject protocol-relative or absolute external URLs.
// ---------------------------------------------------------------------------
export function sanitizeNextPath(input: string | null | undefined, fallback = "/studio"): string {
    if (!input) return fallback;
    const trimmed = input.trim();
    if (!trimmed.startsWith("/")) return fallback;
    if (trimmed.startsWith("//")) return fallback;
    if (trimmed.startsWith("/\\")) return fallback;
    return trimmed;
}
