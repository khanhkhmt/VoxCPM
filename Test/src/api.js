/**
 * VoxCPM Voice Clone TTS API Client
 * All endpoints are relative to the BASE_API_URL configured at runtime.
 */

/**
 * GET /api/v1/usage — Retrieve current usage & quota info
 */
export async function fetchUsage(baseUrl, apiKey) {
  const res = await fetch(`${baseUrl}/api/v1/usage`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  const status = res.status;
  let data;
  try {
    data = await res.json();
  } catch {
    data = { error: "Failed to parse JSON response" };
  }
  return { status, data };
}

/**
 * POST /api/v1/tts/generate — Generate TTS audio (blocking)
 */
export async function generateTTS(baseUrl, apiKey, params) {
  const body = {
    text: params.text || "",
    language: params.language || "auto",
    speed: parseFloat(params.speed) || 1.0,
    format: params.format || "mp3",
    control_instruction: params.control_instruction || "",
    cfg_value: parseFloat(params.cfg_value) || 2.0,
    dit_steps: parseInt(params.dit_steps, 10) || 6,
  };

  const res = await fetch(`${baseUrl}/api/v1/tts/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const status = res.status;
  let data;
  try {
    data = await res.json();
  } catch {
    data = { error: "Failed to parse JSON response" };
  }
  return { status, data };
}

/**
 * POST /api/v1/tts/stream-token — Get a one-time stream token for WebSocket
 */
export async function getStreamToken(baseUrl, apiKey, textLength) {
  const res = await fetch(`${baseUrl}/api/v1/tts/stream-token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text_length: parseInt(textLength, 10) || 100 }),
  });

  const status = res.status;
  let data;
  try {
    data = await res.json();
  } catch {
    data = { error: "Failed to parse JSON response" };
  }
  return { status, data };
}

/**
 * WebSocket /ws/tts/stream?token=<stream_token>
 * Returns a WebSocket instance. Caller is responsible for event handling.
 */
export function createStreamWebSocket(wsUrl, streamToken) {
  const separator = wsUrl.includes("?") ? "&" : "?";
  const url = `${wsUrl}${separator}token=${encodeURIComponent(streamToken)}`;
  return new WebSocket(url);
}
