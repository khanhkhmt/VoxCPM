import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET() {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json(
            { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } },
            { status: 401 },
        );
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
