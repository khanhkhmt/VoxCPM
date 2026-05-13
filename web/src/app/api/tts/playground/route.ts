import { NextRequest, NextResponse } from "next/server";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { checkAndDeductQuota } from "@/lib/quota";
import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import crypto from "crypto";

/**
 * POST /api/tts/playground
 *
 * Session-authenticated proxy for the Playground UI.
 * Instead of requiring an external API key (Bearer token),
 * this endpoint uses the logged-in user's session to authenticate,
 * looks up the voice profile, and calls the backend directly.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();

        const body = await req.json().catch(() => ({}));
        const { text, voiceProfileId } = body;

        if (!text || typeof text !== "string" || text.trim() === "") {
            return jsonError("BAD_REQUEST", "Missing or invalid 'text' parameter", 400);
        }

        if (text.length > 5000) {
            return jsonError("TEXT_TOO_LONG", "Text exceeds maximum length of 5000 characters", 400);
        }

        if (!voiceProfileId || typeof voiceProfileId !== "string") {
            return jsonError("BAD_REQUEST", "Missing or invalid 'voiceProfileId'", 400);
        }

        // Look up voice profile and verify ownership
        const voiceProfile = await prisma.voiceProfile.findUnique({
            where: { id: voiceProfileId },
        });

        if (!voiceProfile) {
            return jsonError("NOT_FOUND", "Voice profile not found", 404);
        }

        if (voiceProfile.userId !== user.id) {
            return jsonError("FORBIDDEN", "You do not own this voice profile", 403);
        }

        const charsToDeduct = text.length;

        // Quota check and deduct
        const success = await checkAndDeductQuota(user.id, charsToDeduct);
        if (!success) {
            return jsonError("QUOTA_EXCEEDED", "Not enough quota remaining", 403);
        }

        // Prepare request to FastAPI backend
        const internalSecret = process.env.TTS_INTERNAL_SECRET;
        if (!internalSecret) {
            return jsonError("INTERNAL_ERROR", "Server configuration error", 500);
        }

        const backendUrl = "http://127.0.0.1:8808/api/tts";
        const generateUrl = backendUrl.replace(/\/$/, "") + "/generate";

        const language = body.language || "auto";
        const speed = body.speed ?? 1.0;
        const format = body.format || "mp3";

        const form = new FormData();
        form.append("text", text);
        form.append("control_instruction", body.control_instruction || "");
        form.append("use_prompt_text", body.use_prompt_text ? "true" : "false");
        form.append("prompt_text", body.prompt_text || "");
        form.append("cfg_value", String(body.cfg_value || 2.0));
        form.append("do_normalize", body.do_normalize ? "true" : "false");
        form.append("denoise", body.denoise ? "true" : "false");
        form.append("dit_steps", String(body.dit_steps || 10));
        form.append("language", language);
        form.append("speed", String(speed));
        form.append("format", format);

        // Resolve voice feature or audio for cloning
        if (voiceProfile.featureUrl) {
            try {
                const featRes = await fetch(voiceProfile.featureUrl);
                if (featRes.ok) {
                    const featBuffer = await featRes.arrayBuffer();
                    form.append("voice_feature", new Blob([featBuffer]), "feature.safetensors");
                }
            } catch {
                // Feature URL inaccessible — fall through to audioUrl
            }
        }
        if (!voiceProfile.featureUrl && voiceProfile.audioUrl) {
            try {
                const audioRes = await fetch(voiceProfile.audioUrl);
                if (audioRes.ok) {
                    const audioBuffer = await audioRes.arrayBuffer();
                    form.append("reference_wav", new Blob([audioBuffer]), voiceProfile.fileName || "reference.wav");
                }
            } catch {
                // Audio URL inaccessible
            }
        }

        const res = await fetch(generateUrl, {
            method: "POST",
            headers: { "X-Internal-Secret": internalSecret },
            body: form,
        });

        if (!res.ok) {
            const errorText = await res.text().catch(() => "Unknown backend error");
            return jsonError("BACKEND_ERROR", `TTS Generation failed: ${errorText}`, res.status);
        }

        const data = await res.json();
        if (!data?.audio_url) {
            return jsonError("BACKEND_ERROR", "No audio returned from backend", 500);
        }

        // Fetch the generated file from FastAPI directly
        const audioFileUrl = `${backendUrl.replace(/\/api\/tts$/, "")}${data.audio_url}`;
        const fileRes = await fetch(audioFileUrl);

        if (!fileRes.ok) {
            return jsonError("BACKEND_ERROR", "Failed to retrieve audio file from backend", 500);
        }

        const arrayBuffer = await fileRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to R2
        const mimeType = format === "wav" ? "audio/wav" : "audio/mpeg";
        const ext = format === "wav" ? "wav" : "mp3";
        const r2Key = `playground/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { r2Url } = await uploadToR2(r2Key, buffer, mimeType);

        return jsonOk({
            success: true,
            voice_id: voiceProfile.id,
            audio_url: r2Url,
            text,
            duration: data.duration || null,
            status: "completed",
            chars_deducted: charsToDeduct,
        });

    } catch (error: unknown) {
        if (error instanceof NextResponse) return error;
        console.error("Playground TTS Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonError("INTERNAL_ERROR", message, 500);
    }
}
