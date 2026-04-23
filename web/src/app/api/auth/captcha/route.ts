import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCaptcha } from "@/lib/auth/captcha";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const uuid = request.nextUrl.searchParams.get("uuid");

    if (!uuid || uuid.length < 1) {
        return NextResponse.json(
            { ok: false, error: { code: "VALIDATION_ERROR", message: "Missing uuid parameter" } },
            { status: 400 },
        );
    }

    const theme = request.nextUrl.searchParams.get("theme");
    const background = theme === "light" ? "#F5F3FA" : "#111827";

    const { text, svg } = await getOrCreateCaptcha(uuid, background);
    console.log(`[DEV] Captcha for ${uuid}: ${text}`);

    return new NextResponse(svg, {
        status: 200,
        headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    });
}
