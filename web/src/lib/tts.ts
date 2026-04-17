const GRADIO_BASE = "";
const GRADIO_API = `${GRADIO_BASE}/gradio_api`;

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
}

export interface TTSResult {
    audioUrl?: string;
    error?: string;
}

/**
 * Upload a File to Gradio's /upload endpoint and return the server-side path.
 * Gradio 6 expects multipart/form-data with one or more files.
 * Returns the first uploaded file path string that Gradio can reference.
 */
export async function uploadFileToGradio(file: File): Promise<string | null> {
    try {
        const form = new FormData();
        form.append("files", file);

        const res = await fetch(`${GRADIO_API}/upload`, {
            method: "POST",
            body: form,
        });

        if (!res.ok) {
            console.error("Gradio upload failed:", res.statusText);
            return null;
        }

        // Gradio returns an array of uploaded file paths
        const paths: string[] = await res.json();
        return paths.length > 0 ? paths[0] : null;
    } catch (err) {
        console.error("File upload error:", err);
        return null;
    }
}

export async function generateSpeech(params: GenerateTTSParams): Promise<TTSResult> {
    try {
        // Gradio generate API inputs from app.py _generate():
        // [text, control_instruction, reference_wav, show_prompt_text, prompt_text,
        //  cfg_value, DoNormalizeText, DoDenoisePromptAudio, dit_steps]

        let refWavPayload: Record<string, unknown> | null = null;

        if (params.referenceWav instanceof File) {
            // Upload via Gradio /upload first, then pass the server path
            const uploadedPath = await uploadFileToGradio(params.referenceWav);
            if (uploadedPath) {
                refWavPayload = { path: uploadedPath, meta: { _type: "gradio.FileData" } };
            } else {
                return { error: "Failed to upload reference audio to backend." };
            }
        } else if (typeof params.referenceWav === "string" && params.referenceWav) {
            refWavPayload = { path: params.referenceWav, meta: { _type: "gradio.FileData" } };
        }

        const payload = {
            data: [
                params.text,                // text
                params.controlInstruction,  // control_instruction
                refWavPayload,              // reference_wav (filepath on server)
                params.usePromptText,       // show_prompt_text (ultimate cloning toggle)
                params.promptText,          // prompt_text
                params.cfgValue,            // cfg_value
                params.doNormalize,         // DoNormalizeText
                params.denoise,             // DoDenoisePromptAudio
                params.ditSteps,            // dit_steps
            ],
        };

        const res = await fetch(`${GRADIO_API}/call/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Gradio API Error ${res.status}: ${body || res.statusText}`);
        }

        const { event_id } = await res.json();

        // Stream the result via SSE — Gradio sends:
        //   event: complete
        //   data: [{path, url, ...}]
        // We use fetch + manual SSE parsing because EventSource.onmessage
        // only fires for unnamed events, while Gradio sends named events.
        const streamUrl = `${GRADIO_API}/call/generate/${event_id}`;

        const sseRes = await fetch(streamUrl);
        if (!sseRes.ok || !sseRes.body) {
            throw new Error(`SSE stream failed: ${sseRes.status}`);
        }

        const reader = sseRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const TIMEOUT_MS = 600_000; // 10 minutes for CPU generation
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Generation timed out after 10 minutes")), TIMEOUT_MS)
        );

        const parsePromise = (async (): Promise<TTSResult> => {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                let currentEvent = "";
                for (const line of lines) {
                    if (line.startsWith("event: ")) {
                        currentEvent = line.slice(7).trim();
                    } else if (line.startsWith("data: ") && currentEvent === "complete") {
                        const raw = line.slice(6);
                        try {
                            const data = JSON.parse(raw);
                            // data is an array: [{path, url, orig_name, ...}]
                            const audioData = Array.isArray(data) ? data[0] : data?.data?.[0];
                            if (!audioData) {
                                return { error: "No audio returned from backend." };
                            }
                            const filePath = audioData.url || audioData.path || audioData.name;
                            // Always route through the Next.js proxy.
                            // Gradio returns URLs like http://127.0.0.1:8808/gradio_api/file=...
                            // We strip the origin and use the relative /gradio_api/... path.
                            let url: string;
                            if (filePath.includes("/gradio_api/")) {
                                url = "/gradio_api/" + filePath.split("/gradio_api/").pop();
                            } else if (filePath.startsWith("/")) {
                                url = `/gradio_api/file=${filePath}`;
                            } else {
                                url = `/gradio_api/file=${filePath}`;
                            }
                            return { audioUrl: url };
                        } catch {
                            // ignore parse errors
                        }
                    } else if (line.startsWith("data: ") && currentEvent === "error") {
                        return { error: line.slice(6) };
                    }
                }
            }
            return { error: "Stream ended without result." };
        })();

        return await Promise.race([parsePromise, timeoutPromise]);
    } catch (error: unknown) {
        let msg = error instanceof Error ? error.message : "Failed to generate speech";
        if (msg.includes("Failed to fetch") || msg.includes("fetch")) {
            msg = "Cannot connect to the TTS backend (port 8808). Please make sure the Gradio server is running: uv run python app.py --port 8808";
        }
        console.error("TTS Generation Error:", error);
        return { error: msg };
    }
}
