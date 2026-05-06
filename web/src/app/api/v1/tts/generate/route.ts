import { NextRequest, NextResponse } from "next/server";
import { requireApiKey, jsonOk, jsonError } from "@/lib/api-utils";
import { checkAndDeductQuota } from "@/lib/quota";
import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const { user } = await requireApiKey(req, "tts.generate");
        
        const body = await req.json().catch(() => ({}));
        const text = body.text;

        if (!text || typeof text !== "string" || text.trim() === "") {
            return jsonError("BAD_REQUEST", "Missing or invalid 'text' parameter", 400);
        }

        const charsToDeduct = text.length;

        // Quota check and deduct (Upfront charging)
        const success = await checkAndDeductQuota(user.id, charsToDeduct);
        if (!success) {
            return jsonError("QUOTA_EXCEEDED", "Not enough quota remaining", 403);
        }

        // Prepare request to FastAPI
        const internalSecret = process.env.TTS_INTERNAL_SECRET;
        if (!internalSecret) {
            return jsonError("INTERNAL_ERROR", "Server configuration error", 500);
        }

        const backendUrl = "http://127.0.0.1:8808/api/tts";
        const generateUrl = backendUrl.replace(/\/$/, "") + "/generate";

        const form = new FormData();
        form.append("text", text);
        form.append("control_instruction", body.control_instruction || "");
        form.append("use_prompt_text", body.use_prompt_text ? "true" : "false");
        form.append("prompt_text", body.prompt_text || "");
        form.append("cfg_value", String(body.cfg_value || 2.0));
        form.append("do_normalize", body.do_normalize ? "true" : "false");
        form.append("denoise", body.denoise ? "true" : "false");
        form.append("dit_steps", String(body.dit_steps || 10));
        form.append("language", body.language || "auto");

        const res = await fetch(generateUrl, {
            method: "POST",
            headers: {
                "X-Internal-Secret": internalSecret,
            },
            body: form,
        });

        if (!res.ok) {
            // MVP tradeoff: no refund on downstream failure
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
        const r2Key = `v1_tts/${user.id}/${crypto.randomUUID()}.wav`;
        const { r2Url } = await uploadToR2(r2Key, buffer, "audio/wav");

        // Save to History (TTSGeneration)
        const generation = await prisma.tTSGeneration.create({
            data: {
                userId: user.id,
                text,
                controlInstruction: body.control_instruction || "",
                audioUrl: r2Url,
                audioR2Key: r2Key,
                language: body.language || "auto",
                cfgValue: Number(body.cfg_value || 2.0),
                ditSteps: Number(body.dit_steps || 10),
                doNormalize: Boolean(body.do_normalize),
                denoise: Boolean(body.denoise),
                usePromptText: Boolean(body.use_prompt_text),
                promptText: body.prompt_text || "",
            }
        });

        // Return envelope { ok, data }
        return jsonOk({
            id: generation.id,
            audio_url: r2Url,
            text,
            chars_deducted: charsToDeduct
        });

    } catch (error: any) {
        if (error instanceof NextResponse) return error;
        console.error("V1 TTS Generate Error:", error);
        return jsonError("INTERNAL_ERROR", error.message, 500);
    }
}
