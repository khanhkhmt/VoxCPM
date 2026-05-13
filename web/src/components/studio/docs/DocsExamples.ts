// Base URL placeholder used in all code examples
export const BASE = "BASE_URL";
export const KEY = "YOUR_API_KEY";

export const CURL_USAGE = `curl ${BASE}/api/v1/usage \\
  -H "Authorization: Bearer ${KEY}"`;

export const CURL_GENERATE = `curl -X POST ${BASE}/api/v1/tts/generate \\
  -H "Authorization: Bearer ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Hello, this is a voice clone test.",
    "language": "auto",
    "format": "mp3",
    "cfg_value": 2.0,
    "dit_steps": 6
  }'`;

export const CURL_STREAM_TOKEN = `curl -X POST ${BASE}/api/v1/tts/stream-token \\
  -H "Authorization: Bearer ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"text_length": 200}'`;

export const PYTHON_GENERATE = `import requests

BASE_URL = "http://127.0.0.1:3000"   # ← change for production
API_KEY  = "vc_sk_live_xxxxx"

res = requests.post(
    f"{BASE_URL}/api/v1/tts/generate",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "text": "Xin chào, đây là bài test giọng nói.",
        "language": "vi",
        "format": "mp3",
        "cfg_value": 2.0,
        "dit_steps": 6,
    },
)

data = res.json()
if data.get("ok"):
    print("Audio URL:", data["data"]["audio_url"])
else:
    print("Error:", data["error"]["message"])`;

export const PYTHON_WEBSOCKET = `import requests, json, websocket

BASE_URL = "http://127.0.0.1:3000"
API_KEY  = "vc_sk_live_xxxxx"

# Step 1 — Get a stream token (quota deducted here)
token_res = requests.post(
    f"{BASE_URL}/api/v1/tts/stream-token",
    headers={"Authorization": f"Bearer {API_KEY}",
             "Content-Type": "application/json"},
    json={"text_length": 200},
)
td = token_res.json()["data"]
print(f"Token expires in {td['expires_in']}s, {td['chars_deducted']} chars deducted")

# Step 2 — Connect WebSocket with token
ws = websocket.create_connection(
    f"{td['ws_url']}?token={td['stream_token']}"
)

# Step 3 — Send start message
ws.send(json.dumps({
    "type": "start",
    "text": "Xin chào thế giới",
    "language": "vi",
    "cfg_value": 2.0,
    "dit_steps": 6,
    "streaming_mode": "stable",
}))

# Step 4 — Receive audio chunks (PCM16 binary)
while True:
    data = ws.recv()
    if isinstance(data, bytes):
        print(f"Audio chunk: {len(data)} bytes")
    else:
        msg = json.loads(data)
        print(f"Event: {msg.get('type')}")
        if msg.get("type") in ("done", "error"):
            break

ws.close()`;

export const JS_GENERATE = `const BASE_URL = "http://127.0.0.1:3000"; // ← change for production
const API_KEY  = "vc_sk_live_xxxxx";

const res = await fetch(\`\${BASE_URL}/api/v1/tts/generate\`, {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    text: "Hello, this is a voice clone test.",
    language: "auto",
    format: "mp3",
    cfg_value: 2.0,
    dit_steps: 6,
  }),
});

const { ok, data, error } = await res.json();
if (ok) {
  console.log("Audio URL:", data.audio_url);
  // Play it: new Audio(data.audio_url).play();
} else {
  console.error("Error:", error.message);
}`;

export const JS_WEBSOCKET = `const BASE_URL = "http://127.0.0.1:3000";
const API_KEY  = "vc_sk_live_xxxxx";

// Step 1 — Get stream token
const tokenRes = await fetch(\`\${BASE_URL}/api/v1/tts/stream-token\`, {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ text_length: 200 }),
});
const { data: td } = await tokenRes.json();

// Step 2 — Open WebSocket
const ws = new WebSocket(\`\${td.ws_url}?token=\${td.stream_token}\`);
ws.binaryType = "arraybuffer";

// Step 3 — Send start message on connect
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "start",
    text: "Hello from WebSocket streaming!",
    language: "auto",
    cfg_value: 2.0,
    dit_steps: 6,
    streaming_mode: "stable",
  }));
};

// Step 4 — Handle audio chunks + events
const audioCtx = new AudioContext({ sampleRate: 24000 });
ws.onmessage = (event) => {
  if (event.data instanceof ArrayBuffer) {
    // PCM16 audio chunk — decode and play
    const pcm16 = new Int16Array(event.data);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;
    const buf = audioCtx.createBuffer(1, float32.length, 24000);
    buf.getChannelData(0).set(float32);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start();
  } else {
    const msg = JSON.parse(event.data);
    if (msg.type === "done") console.log("Stream complete:", msg.audio_url);
    if (msg.type === "error") console.error("Stream error:", msg.message);
  }
};`;

export const RESPONSE_USAGE = `{
  "ok": true,
  "data": {
    "environment": "live",
    "limit": 500000,
    "used": 1234,
    "remaining": 498766,
    "reset_date": "2026-06-01T00:00:00.000Z"
  }
}`;

export const RESPONSE_GENERATE = `{
  "ok": true,
  "data": {
    "success": true,
    "request_id": "cmp3sih7p0002v9o670rd59xc",
    "voice_id": "clx8abc123def",
    "audio_url": "https://cdn.example.com/v1_tts/user123/audio.mp3",
    "text": "Hello, this is a voice clone test.",
    "duration": null,
    "status": "completed",
    "chars_deducted": 34
  }
}`;

export const RESPONSE_STREAM_TOKEN = `{
  "ok": true,
  "data": {
    "stream_token": "eyJhbGciOiJIUzI1NiJ9...",
    "ws_url": "ws://127.0.0.1:8808/ws/tts/stream",
    "max_length": 200,
    "chars_deducted": 200,
    "expires_in": 60
  }
}`;

export const RESPONSE_ERROR = `{
  "ok": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API key is invalid"
  }
}`;

export const WS_START_MSG = `{
  "type": "start",
  "text": "Text to synthesize",
  "language": "auto",
  "control_instruction": "",
  "cfg_value": 2.0,
  "dit_steps": 6,
  "streaming_mode": "stable"
}`;

export const WS_EVENTS = `// Server → Client events:

// 1. Stream metadata (JSON)
{"type": "start", "format": "pcm16", "sample_rate": 24000}

// 2. Audio chunks (Binary ArrayBuffer — PCM16 LE)
// Multiple binary frames of raw audio data

// 3. Completion (JSON)
{"type": "done", "audio_url": "/api/tts/file/abc123.wav"}

// 4. Error (JSON)
{"type": "error", "message": "Description of what went wrong"}`;
