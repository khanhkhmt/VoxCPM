import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ detail: "Unauthorized: Please log in first." }, { status: 401 });
        }

        const formData = await req.formData();
        
        const internalSecret = process.env.TTS_INTERNAL_SECRET;
        if (!internalSecret) {
            console.error("Missing TTS_INTERNAL_SECRET env var");
            return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
        }

        const backendUrl = process.env.NEXT_PUBLIC_TTS_API_BASE || "http://127.0.0.1:8808/api/tts";
        const generateUrl = backendUrl.replace(/\/$/, "") + "/generate";

        const res = await fetch(generateUrl, {
            method: "POST",
            headers: {
                "X-Internal-Secret": internalSecret,
            },
            body: formData,
        });

        if (!res.ok) {
            let errorText = await res.text();
            try {
                const parsed = JSON.parse(errorText);
                return NextResponse.json(parsed, { status: res.status });
            } catch {
                return NextResponse.json({ detail: errorText || "Backend error" }, { status: res.status });
            }
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("TTS Batch Proxy Error:", error);
        return NextResponse.json({ detail: error.message || "Proxy error" }, { status: 500 });
    }
}
