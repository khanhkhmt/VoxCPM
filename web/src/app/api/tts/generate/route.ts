import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth/server";
import axios from "axios";

const FEATURE_FILE_RE = /^[A-Fa-f0-9]+\.safetensors$/;
const FEATURE_MAX_BYTES = 50 * 1024 * 1024;

// Allow-list of HTTPS prefixes the proxy is willing to fetch feature
// files from. Mirrors the URL construction in `web/src/lib/r2.ts`.
function r2AllowedPrefixes(): string[] {
    const prefixes: string[] = [];
    const explicit = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
    if (explicit) prefixes.push(explicit + "/");
    const accountId = process.env.R2_ACCOUNT_ID;
    const bucket = process.env.R2_BUCKET_NAME;
    if (accountId && bucket) {
        prefixes.push(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/`);
    }
    return prefixes;
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ detail: "Unauthorized: Please log in first." }, { status: 401 });
        }

        const formData = await req.formData();

        // The browser only knows the R2 URL of a cached voice feature, but
        // the FastAPI backend deliberately never makes outbound HTTPS calls
        // (no SSRF surface). When `voice_feature_url` is an R2 URL we
        // fetch it server-side here and forward the bytes as a multipart
        // `voice_feature` upload. Relative `/api/tts/file/...` URLs (e.g.
        // a feature that was just produced by `/api/tts/encode-voice` and
        // is still cached in OUTPUT_DIR) are forwarded as-is.
        const featUrlRaw = formData.get("voice_feature_url");
        if (typeof featUrlRaw === "string" && featUrlRaw.length > 0) {
            const featUrl = featUrlRaw.trim();
            const allowedPrefixes = r2AllowedPrefixes();
            const matchesR2 = allowedPrefixes.some((p) => featUrl.startsWith(p));
            if (featUrl.startsWith("/")) {
                // Backend resolves it locally; just pass through.
            } else if (matchesR2) {
                const filename = (featUrl.split("/").pop() || "")
                    .split("?")[0]
                    .split("#")[0];
                if (!FEATURE_FILE_RE.test(filename)) {
                    return NextResponse.json(
                        { detail: "Invalid feature filename in URL." },
                        { status: 400 },
                    );
                }
                let featRes: Response;
                try {
                    featRes = await fetch(featUrl, {
                        signal: AbortSignal.timeout(30_000),
                    });
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : "network error";
                    return NextResponse.json(
                        { detail: `Failed to fetch feature file: ${msg}` },
                        { status: 502 },
                    );
                }
                if (!featRes.ok) {
                    return NextResponse.json(
                        { detail: `Failed to fetch feature file: HTTP ${featRes.status}` },
                        { status: 502 },
                    );
                }
                const buf = await featRes.arrayBuffer();
                if (buf.byteLength > FEATURE_MAX_BYTES) {
                    return NextResponse.json(
                        { detail: "Feature file too large (>50MB)." },
                        { status: 400 },
                    );
                }
                formData.delete("voice_feature_url");
                formData.set(
                    "voice_feature",
                    new Blob([buf], { type: "application/octet-stream" }),
                    filename,
                );
            } else {
                return NextResponse.json(
                    {
                        detail:
                            "voice_feature_url must be a relative /api/tts/file/<name>.safetensors URL " +
                            "or an https URL whose origin matches R2_PUBLIC_URL or " +
                            "https://<account-id>.r2.cloudflarestorage.com/<bucket>/.",
                    },
                    { status: 400 },
                );
            }
        }

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

        const backendUrl = `${BACKEND_BASE_URL}/api/tts`;
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
