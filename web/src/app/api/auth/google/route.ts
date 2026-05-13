import { NextRequest, NextResponse } from "next/server";
import {
    buildGoogleAuthUrl,
    generateOAuthState,
    GOOGLE_OAUTH_NEXT_COOKIE,
    GOOGLE_OAUTH_STATE_COOKIE,
    isGoogleOAuthConfigured,
    resolveRequestOrigin,
    sanitizeNextPath,
} from "@/lib/auth/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE_MAX_AGE = 10 * 60; // 10 minutes

export async function GET(request: NextRequest) {
    if (!isGoogleOAuthConfigured()) {
        const url = new URL("/login", resolveRequestOrigin(request));
        url.searchParams.set("error", "google_not_configured");
        return NextResponse.redirect(url);
    }

    const state = generateOAuthState();
    const authUrl = buildGoogleAuthUrl(state);
    const nextParam = sanitizeNextPath(request.nextUrl.searchParams.get("next"));

    const response = NextResponse.redirect(authUrl);
    const isProd = process.env.NODE_ENV === "production";

    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: STATE_COOKIE_MAX_AGE,
    });

    response.cookies.set(GOOGLE_OAUTH_NEXT_COOKIE, nextParam, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: STATE_COOKIE_MAX_AGE,
    });

    return response;
}
