import { NextRequest, NextResponse } from "next/server";
import { requireApiKey, jsonOk, jsonError } from "@/lib/api-utils";
import { checkAndDeductQuota } from "@/lib/quota";
import { SignJWT } from "jose";

export async function POST(req: NextRequest) {
    try {
        const { user } = await requireApiKey(req, "tts.stream");
        
        const body = await req.json().catch(() => ({}));
        const text_length = Number(body.text_length);

        if (!text_length || isNaN(text_length) || text_length <= 0) {
            return jsonError("BAD_REQUEST", "Missing or invalid 'text_length' parameter. Must be > 0.", 400);
        }

        if (text_length > 10000) {
            return jsonError("BAD_REQUEST", "text_length exceeds maximum limit of 10000", 400);
        }

        // Quota check and deduct
        const success = await checkAndDeductQuota(user.id, text_length);
        if (!success) {
            return jsonError("QUOTA_EXCEEDED", "Not enough quota remaining for this stream", 403);
        }

        const internalSecret = process.env.TTS_INTERNAL_SECRET;
        if (!internalSecret) {
            return jsonError("INTERNAL_ERROR", "Server configuration error", 500);
        }

        const backendUrl = "http://127.0.0.1:8808/api/tts";
        let wsUrl = "";
        try {
            const url = new URL(backendUrl);
            url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
            url.pathname = "/ws/tts/stream";
            wsUrl = url.toString();
        } catch {
            wsUrl = "ws://127.0.0.1:8808/ws/tts/stream";
        }

        // Issue short-lived JWT token (60 seconds) with max_length claim
        const secretKey = new TextEncoder().encode(internalSecret);
        const token = await new SignJWT({ sub: user.id, max_length: text_length })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("60s")
            .sign(secretKey);

        return jsonOk({ 
            stream_token: token, 
            ws_url: wsUrl,
            max_length: text_length,
            chars_deducted: text_length,
            expires_in: 60
        });

    } catch (error: any) {
        if (error instanceof NextResponse) return error;
        console.error("V1 Stream Token Error:", error);
        return jsonError("INTERNAL_ERROR", error.message, 500);
    }
}
