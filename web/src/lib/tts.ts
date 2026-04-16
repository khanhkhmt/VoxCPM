const GRADIO_BASE = "http://localhost:8808";
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

        let refWavPayload: string | null = null;

        if (params.referenceWav instanceof File) {
            // Upload via Gradio /upload first, then pass the server path
            const uploadedPath = await uploadFileToGradio(params.referenceWav);
            if (uploadedPath) {
                refWavPayload = uploadedPath;
            } else {
                return { error: "Failed to upload reference audio to backend." };
            }
        } else if (typeof params.referenceWav === "string" && params.referenceWav) {
            refWavPayload = params.referenceWav;
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

        // Stream the result via SSE
        const streamUrl = `${GRADIO_API}/call/generate/${event_id}`;

        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(streamUrl);
            let settled = false;

            const timeout = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    eventSource.close();
                    reject(new Error("Generation timed out after 120s"));
                }
            }, 120_000);

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.msg === "process_completed") {
                        settled = true;
                        clearTimeout(timeout);
                        eventSource.close();

                        if (data.success) {
                            const audioData = data.output?.data?.[0];
                            if (!audioData) {
                                resolve({ error: "No audio returned from backend." });
                                return;
                            }
                            // Gradio audio output is usually {path, url, ...}
                            const filePath = audioData.path || audioData.name || audioData.url;
                            const url = filePath.startsWith("http")
                                ? filePath
                                : `${GRADIO_BASE}/gradio_api/file=${filePath}`;
                            resolve({ audioUrl: url });
                        } else {
                            resolve({ error: data.error || "Synthesis failed on backend." });
                        }
                    }
                } catch (parseErr) {
                    // Ignore non-JSON heartbeat messages
                }
            };

            eventSource.onerror = () => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    eventSource.close();
                    reject(new Error("Connection to generation stream lost."));
                }
            };
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to generate speech";
        console.error("TTS Generation Error:", error);
        return { error: msg };
    }
}
