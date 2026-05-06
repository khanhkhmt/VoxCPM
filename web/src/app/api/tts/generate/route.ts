import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import axios from "axios";

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ detail: "Unauthorized: Please log in first." }, { status: 401 });
        }

        const formData = await req.formData();

        if (process.env.NODE_ENV !== "production") {
            const debug: Record<string, string> = {};
            formData.forEach((v, k) => {
                debug[k] = v instanceof File ? `<File ${v.name} ${v.size}B>` : String(v);
            });
            console.log("[/api/tts/generate] forwarding fields:", debug);
        }

        const internalSecret = process.env.TTS_INTERNAL_SECRET;
        if (!internalSecret) {
            console.error("Missing TTS_INTERNAL_SECRET env var");
            return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
        }

        const backendUrl = "http://127.0.0.1:8808/api/tts";
        const generateUrl = backendUrl.replace(/\/$/, "") + "/generate";

        const res = await axios.post(generateUrl, formData, {
            headers: {
                "X-Internal-Secret": internalSecret,
            },
            timeout: 0,
            validateStatus: () => true,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        });

        if (res.status >= 400) {
            return NextResponse.json(res.data, { status: res.status });
        }

        return NextResponse.json(res.data);
    } catch (error: any) {
        console.error("TTS Batch Proxy Error:", error);
        return NextResponse.json({ detail: error.message || "Proxy error" }, { status: 500 });
    }
}
