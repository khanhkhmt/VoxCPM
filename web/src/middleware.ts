import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
    process.env.AUTH_JWT_SECRET || "dev-secret-CHANGE-ME-in-production-please",
);
const SESSION_COOKIE = "voxora_session";

// Paths that require authentication
const PROTECTED_PATHS = ["/studio"];
// Paths that should redirect to /studio if already logged in
const AUTH_PATHS = ["/login", "/register"];

async function verifyToken(token: string): Promise<boolean> {
    try {
        await jwtVerify(token, JWT_SECRET);
        return true;
    } catch {
        return false;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    const isProtected = PROTECTED_PATHS.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    const isAuthPage = AUTH_PATHS.some((p) => pathname === p);

    if (isProtected) {
        if (!token || !(await verifyToken(token))) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("next", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    if (isAuthPage && token && (await verifyToken(token))) {
        return NextResponse.redirect(new URL("/studio", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/studio/:path*", "/login", "/register"],
};
