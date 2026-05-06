import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { SignJWT } from "jose";

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ detail: "Unauthorized: Please log in first." }, { status: 401 });
        }

        const internalSecret = process.env.TTS_INTERNAL_SECRET;
        if (!internalSecret) {
            console.error("Missing TTS_INTERNAL_SECRET env var");
            return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
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

        // Issue short-lived JWT token (60 seconds)
        const secretKey = new TextEncoder().encode(internalSecret);
        const token = await new SignJWT({ sub: user.id, max_length: 10000 })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("60s")
            .sign(secretKey);

        return NextResponse.json({ stream_token: token, ws_url: wsUrl });
    } catch (error: any) {
        console.error("TTS Stream Token Error:", error);
        return NextResponse.json({ detail: error.message || "Proxy error" }, { status: 500 });
    }
}
