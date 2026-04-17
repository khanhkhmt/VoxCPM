import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function POST() {
    await revokeCurrentSession();

    return NextResponse.json({ ok: true });
}
