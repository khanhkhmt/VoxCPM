import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function POST() {
    await revokeCurrentSession();

    const response = NextResponse.json({ ok: true });

    // Explicitly clear cookie on the response to guarantee
    // the browser removes it, even if revokeCurrentSession's
    // cookies().delete() doesn't propagate properly.
    response.cookies.set("voxora_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });

    return response;
}
