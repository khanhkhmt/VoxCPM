import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionAndSetCookie } from "@/lib/auth/server";
import {
    exchangeCodeForToken,
    fetchGoogleProfile,
    findOrCreateGoogleUser,
    GOOGLE_OAUTH_NEXT_COOKIE,
    GOOGLE_OAUTH_STATE_COOKIE,
    isGoogleOAuthConfigured,
    resolveRequestOrigin,
    sanitizeNextPath,
} from "@/lib/auth/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loginErrorRedirect(request: NextRequest, code: string) {
    const url = new URL("/login", resolveRequestOrigin(request));
    url.searchParams.set("error", code);
    return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
    if (!isGoogleOAuthConfigured()) {
        return loginErrorRedirect(request, "google_not_configured");
    }

    const params = request.nextUrl.searchParams;
    const error = params.get("error");
    const code = params.get("code");
    const state = params.get("state");

    const cookieStore = await cookies();
    const storedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ?? null;
    const storedNext = cookieStore.get(GOOGLE_OAUTH_NEXT_COOKIE)?.value ?? null;

    // Always clear the state cookies — one-time use.
    cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);
    cookieStore.delete(GOOGLE_OAUTH_NEXT_COOKIE);

    if (error) {
        return loginErrorRedirect(request, "google_oauth_denied");
    }
    if (!code) {
        return loginErrorRedirect(request, "google_missing_code");
    }
    if (!state || !storedState || state !== storedState) {
        return loginErrorRedirect(request, "google_invalid_state");
    }

    // Exchange code for tokens
    let token;
    try {
        token = await exchangeCodeForToken(code);
    } catch {
        return loginErrorRedirect(request, "google_token_exchange_failed");
    }

    // Fetch profile via userinfo endpoint
    let profile;
    try {
        profile = await fetchGoogleProfile(token.access_token);
    } catch {
        return loginErrorRedirect(request, "google_profile_failed");
    }

    if (!profile.email) {
        return loginErrorRedirect(request, "google_no_email");
    }
    if (profile.email_verified !== true) {
        return loginErrorRedirect(request, "google_email_not_verified");
    }

    // Find or create user, link OAuthAccount, create session
    let result;
    try {
        result = await findOrCreateGoogleUser(profile);
    } catch (err) {
        console.error("[google-callback] findOrCreateGoogleUser error:", err);
        return loginErrorRedirect(request, "google_login_failed");
    }

    try {
        await createSessionAndSetCookie(result.userId);
    } catch (err) {
        console.error("[google-callback] session error:", err);
        return loginErrorRedirect(request, "google_login_failed");
    }

    const nextPath = sanitizeNextPath(storedNext);
    return NextResponse.redirect(new URL(nextPath, resolveRequestOrigin(request)));
}
