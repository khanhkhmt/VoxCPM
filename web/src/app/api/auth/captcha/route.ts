import { NextRequest, NextResponse } from "next/server";
import { generateCaptchaSvg, storeCaptcha } from "@/lib/auth/captcha";
import { captchaLimiter } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const uuid = request.nextUrl.searchParams.get("uuid");

    if (!uuid || uuid.length < 1) {
        return NextResponse.json(
            { ok: false, error: { code: "VALIDATION_ERROR", message: "Missing uuid parameter" } },
            { status: 400 },
        );
    }

    // Rate-limit by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ?? "unknown";
    const rateLimitResult = await captchaLimiter.limit(`captcha:${ip}`);
    if (!rateLimitResult.success) {
        return NextResponse.json(
            { ok: false, error: { code: "RATE_LIMITED", message: "Too many captcha requests. Please wait." } },
            { status: 429 },
        );
    }

    const { text, svg } = generateCaptchaSvg();
    await storeCaptcha(uuid, text);

    return new NextResponse(svg, {
        status: 200,
        headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    });
}
