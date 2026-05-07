const FASTAPI_BASE = process.env.VOXCPM_API_BASE || "http://localhost:8808";
const INTERNAL_SECRET = process.env.TTS_INTERNAL_SECRET || "";

interface EncodeVoiceResult {
  feature_url: string;
  feature_size: number;
  shape: number[];
  metadata: Record<string, string>;
}

export async function encodeVoiceFromWav(
  file: Buffer,
  fileName: string,
  contentType: string,
): Promise<EncodeVoiceResult> {
  const form = new FormData();
  form.append(
    "reference_wav",
    new Blob([new Uint8Array(file)], { type: contentType }),
    fileName,
  );
  form.append("trim_silence_vad", "false");
  const res = await fetch(`${FASTAPI_BASE}/api/tts/encode-voice`, {
    method: "POST",
    body: form,
    headers: { "X-Internal-Secret": INTERNAL_SECRET },
  });
  if (!res.ok)
    throw new Error(`encode-voice failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<EncodeVoiceResult>;
}

export async function downloadFeatureBytes(
  relativeUrl: string,
): Promise<Buffer> {
  const res = await fetch(`${FASTAPI_BASE}${relativeUrl}`);
  if (!res.ok)
    throw new Error(`download feature failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
