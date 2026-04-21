const TTS_API = (process.env.NEXT_PUBLIC_TTS_API_BASE || "http://127.0.0.1:8808/api/tts").replace(/\/$/, "");

function getApiOrigin(): string {
    return TTS_API.replace(/\/api\/tts$/, "");
}

export interface GenerateTTSParams {
    text: string;
    controlInstruction: string;
    referenceWav?: File | string | null;
    usePromptText: boolean;
    promptText: string;
    cfgValue: number;
    doNormalize: boolean;
    denoise: boolean;
    ditSteps: number;
    language: string;
}

export interface TTSResult {
    audioUrl?: string;
    error?: string;
}

export async function generateSpeech(params: GenerateTTSParams): Promise<TTSResult> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
        // Fast fail if backend is offline.
        const healthRes = await fetch(`${TTS_API}/health`, { method: "GET" });
        if (!healthRes.ok) {
            return { error: "TTS backend is unavailable. Please ensure FastAPI is running on port 8808." };
        }

        const form = new FormData();
        form.append("text", params.text);
        form.append("control_instruction", params.controlInstruction);
        form.append("use_prompt_text", String(params.usePromptText));
        form.append("prompt_text", params.promptText);
        form.append("cfg_value", String(params.cfgValue));
        form.append("do_normalize", String(params.doNormalize));
        form.append("denoise", String(params.denoise));
        form.append("dit_steps", String(params.ditSteps));
        form.append("language", params.language);

        if (params.referenceWav instanceof File) {
            form.append("reference_wav", params.referenceWav);
        }

        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), 600_000);

        const res = await fetch(`${TTS_API}/generate`, {
            method: "POST",
            body: form,
            signal: controller.signal,
        });
        clearTimeout(timeout);
        timeout = undefined;

        if (!res.ok) {
            let detail = "";
            try {
                const body = await res.json();
                detail = body?.detail ? String(body.detail) : "";
            } catch {
                detail = await res.text();
            }
            throw new Error(`TTS API Error ${res.status}: ${detail || res.statusText || "Internal Server Error"}`);
        }

        const data = await res.json();
        if (!data?.audio_url) {
            return { error: "No audio returned from backend." };
        }

        const apiUrl = String(data.audio_url);
        const audioUrl = apiUrl.startsWith("/api/tts/")
            ? `${getApiOrigin()}${apiUrl}`
            : apiUrl;

        return { audioUrl };
    } catch (error: unknown) {
        if (timeout) clearTimeout(timeout);
        let msg = error instanceof Error ? error.message : "Failed to generate speech";
        if (error instanceof Error && error.name === "AbortError") {
            msg = "Generation timed out after 10 minutes";
        } else if (msg.includes("Failed to fetch") || msg.includes("fetch")) {
            msg = "Cannot connect to the TTS backend (port 8808). Please make sure the FastAPI server is running: python app.py --port 8808";
        }
        console.error("TTS Generation Error:", error);
        return { error: msg };
    }
}
