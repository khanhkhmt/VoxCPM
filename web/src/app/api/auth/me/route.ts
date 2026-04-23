import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET() {
    const user = await getCurrentUser();

    if (!user) {
        const response = NextResponse.json(
            { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } },
            { status: 401 },
        );

        // KEY FIX: Clear the stale cookie so middleware won't redirect
        // /login → /studio on the next request. This breaks the
        // infinite redirect loop when user is deleted from DB.
        response.cookies.set("voxora_session", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        });

        return response;
    }

    return NextResponse.json({
        ok: true,
        data: {
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
            }
        },
    });
}
