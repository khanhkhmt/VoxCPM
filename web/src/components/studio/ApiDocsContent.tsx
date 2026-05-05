"use client";

import { useState } from "react";
import { Copy, Check, Zap, Server, Key, BarChart3, ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Reusable sub-components                                           */
/* ------------------------------------------------------------------ */

function CopyBlock({ code, language = "bash" }: { code: string; language?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="relative group rounded-xl overflow-hidden border border-vox-outline/20 bg-vox-surface-low">
            <div className="flex items-center justify-between px-4 py-2 bg-vox-surface border-b border-vox-outline/10 text-xs text-vox-text-dim font-mono">
                <span>{language}</span>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-vox-text-dim hover:text-vox-heading transition-colors">
                    {copied ? <><Check size={14} className="text-green-400" /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-vox-text leading-relaxed whitespace-pre">{code}</pre>
        </div>
    );
}

function ParamRow({ name, type, required, desc, def }: { name: string; type: string; required?: boolean; desc: string; def?: string }) {
    return (
        <tr className="border-b border-vox-outline/10 last:border-0">
            <td className="py-3 pr-3 align-top">
                <code className="text-sm font-mono text-vox-primary bg-vox-primary/10 px-1.5 py-0.5 rounded">{name}</code>
            </td>
            <td className="py-3 pr-3 align-top text-sm text-vox-text-dim font-mono">{type}</td>
            <td className="py-3 pr-3 align-top text-sm">
                {required ? <span className="text-red-400 font-semibold text-xs">Required</span> : <span className="text-vox-text-dim text-xs">Optional</span>}
            </td>
            <td className="py-3 align-top text-sm text-vox-text">
                {desc}
                {def && <span className="text-vox-text-dim ml-1">(default: <code className="text-xs bg-vox-surface px-1 py-0.5 rounded">{def}</code>)</span>}
            </td>
        </tr>
    );
}

function SectionCard({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className="bg-vox-surface border border-vox-outline/20 rounded-2xl overflow-hidden scroll-mt-24">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-vox-outline/10">
                <div className="w-10 h-10 rounded-xl bg-vox-primary/10 flex items-center justify-center text-vox-primary">{icon}</div>
                <h2 className="text-xl font-bold text-vox-heading">{title}</h2>
            </div>
            <div className="px-6 py-6 space-y-6">{children}</div>
        </section>
    );
}

function MethodBadge({ method }: { method: string }) {
    const colors: Record<string, string> = {
        GET: "bg-green-500/15 text-green-400 border-green-500/30",
        POST: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        WS: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    };
    return <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${colors[method] || "bg-vox-surface text-vox-text"}`}>{method}</span>;
}

function EndpointHeader({ method, path, desc }: { method: string; path: string; desc: string }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <MethodBadge method={method} />
                <code className="text-base font-mono font-bold text-vox-heading">{path}</code>
            </div>
            <p className="text-sm text-vox-text-dim">{desc}</p>
            <p className="text-xs text-vox-text-dim">Auth: <code className="bg-vox-surface-low px-1.5 py-0.5 rounded">Authorization: Bearer &lt;api_key&gt;</code></p>
        </div>
    );
}

function CollapsibleExample({ title, children }: { title: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-vox-outline/15 rounded-xl overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-vox-heading bg-vox-surface-low hover:bg-vox-surface transition-colors">
                {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {title}
            </button>
            {open && <div className="p-4 space-y-4 border-t border-vox-outline/10">{children}</div>}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function ApiDocsContent() {
    const NAV = [
        { id: "overview", label: "Overview" },
        { id: "auth", label: "Authentication" },
        { id: "generate", label: "POST /tts/generate" },
        { id: "stream-token", label: "POST /tts/stream-token" },
        { id: "streaming", label: "WebSocket Streaming" },
        { id: "usage", label: "GET /usage" },
        { id: "quota", label: "Quota & Limits" },
        { id: "errors", label: "Error Handling" },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <Link href="/studio/settings" className="inline-flex items-center gap-1.5 text-sm text-vox-text-dim hover:text-vox-primary transition-colors mb-4">
                        <ArrowLeft size={16} /> Back to Settings
                    </Link>
                    <h1 className="text-3xl font-bold text-vox-heading tracking-tight">API Documentation</h1>
                    <p className="text-vox-text-dim mt-2 text-lg">VoxCPM Text-to-Speech API v1</p>
                </div>
            </header>

            {/* Quick nav */}
            <nav className="bg-vox-surface border border-vox-outline/20 rounded-2xl p-4 flex flex-wrap gap-2">
                {NAV.map(n => (
                    <a key={n.id} href={`#${n.id}`} className="px-3 py-1.5 rounded-lg text-sm text-vox-text-dim hover:text-vox-heading hover:bg-vox-primary/10 transition-colors">{n.label}</a>
                ))}
            </nav>

            {/* ---- Overview ---- */}
            <SectionCard id="overview" icon={<Server size={20} />} title="Overview">
                <p className="text-vox-text leading-relaxed">
                    The VoxCPM API provides programmatic access to high-quality Text-to-Speech generation.
                    All endpoints are served under <code className="text-sm bg-vox-surface-low px-1.5 py-0.5 rounded font-mono text-vox-primary">/api/v1/</code> and
                    require a valid API key for authentication.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                    <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                        <p className="text-xs text-vox-text-dim mb-1">Base URL</p>
                        <code className="text-sm font-mono text-vox-heading break-all">https://your-domain.com/api/v1</code>
                    </div>
                    <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                        <p className="text-xs text-vox-text-dim mb-1">Content Type</p>
                        <code className="text-sm font-mono text-vox-heading">application/json</code>
                    </div>
                    <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                        <p className="text-xs text-vox-text-dim mb-1">Response Format</p>
                        <code className="text-sm font-mono text-vox-heading">{"{ ok, data | error }"}</code>
                    </div>
                </div>
            </SectionCard>

            {/* ---- Authentication ---- */}
            <SectionCard id="auth" icon={<Key size={20} />} title="Authentication">
                <p className="text-vox-text leading-relaxed">
                    All API requests require a Bearer token in the <code className="text-sm bg-vox-surface-low px-1.5 py-0.5 rounded font-mono">Authorization</code> header.
                    Create API keys from the <Link href="/studio/settings" className="text-vox-primary hover:underline">Settings</Link> page.
                </p>
                <CopyBlock language="http" code={`Authorization: Bearer vox_sk_test_xxxxxxxxxxxxxxxx`} />
                <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10 space-y-2 text-sm">
                    <p className="font-semibold text-vox-heading">Key format</p>
                    <ul className="list-disc list-inside text-vox-text space-y-1 ml-2">
                        <li><code className="font-mono text-xs bg-vox-surface px-1 rounded">vox_sk_test_...</code> — Test environment keys</li>
                        <li><code className="font-mono text-xs bg-vox-surface px-1 rounded">vox_sk_live_...</code> — Live environment keys</li>
                    </ul>
                    <p className="text-vox-text-dim mt-2">Each key is bound to scopes: <code className="font-mono text-xs">tts.generate</code>, <code className="font-mono text-xs">tts.stream</code>, <code className="font-mono text-xs">usage.read</code></p>
                </div>
            </SectionCard>

            {/* ---- POST /api/v1/tts/generate ---- */}
            <SectionCard id="generate" icon={<Zap size={20} />} title="Generate Speech (Batch)">
                <EndpointHeader method="POST" path="/api/v1/tts/generate" desc="Generate a complete audio file from text. Quota is deducted upfront based on input text length." />

                <h3 className="text-sm font-bold text-vox-heading mt-4">Request Body (JSON)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead><tr className="border-b border-vox-outline/20 text-xs text-vox-text-dim uppercase">
                            <th className="py-2 pr-3">Param</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Required</th><th className="py-2">Description</th>
                        </tr></thead>
                        <tbody>
                            <ParamRow name="text" type="string" required desc="The text to synthesize into speech." />
                            <ParamRow name="language" type="string" desc="Language code." def='"auto"' />
                            <ParamRow name="control_instruction" type="string" desc="Prosody/style control instruction." def='""' />
                            <ParamRow name="cfg_value" type="number" desc="Classifier-free guidance scale." def="2.0" />
                            <ParamRow name="dit_steps" type="number" desc="Number of DiT inference steps." def="10" />
                            <ParamRow name="do_normalize" type="boolean" desc="Apply text normalization." def="false" />
                            <ParamRow name="denoise" type="boolean" desc="Apply audio denoising." def="false" />
                            <ParamRow name="use_prompt_text" type="boolean" desc="Use prompt text for voice cloning." def="false" />
                            <ParamRow name="prompt_text" type="string" desc="Prompt text (used when use_prompt_text is true)." def='""' />
                        </tbody>
                    </table>
                </div>

                <h3 className="text-sm font-bold text-vox-heading">Success Response (200)</h3>
                <CopyBlock language="json" code={`{
  "ok": true,
  "data": {
    "id": "clxxx_generation_id",
    "audio_url": "https://r2-public-url/v1_tts/user_id/uuid.wav",
    "text": "Hello world",
    "chars_deducted": 11
  }
}`} />

                <CollapsibleExample title="cURL Example">
                    <CopyBlock code={`curl -X POST https://your-domain.com/api/v1/tts/generate \\
  -H "Authorization: Bearer vox_sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Xin chào thế giới",
    "language": "vi",
    "cfg_value": 2.0,
    "dit_steps": 10
  }'`} />
                </CollapsibleExample>

                <CollapsibleExample title="JavaScript fetch Example">
                    <CopyBlock language="javascript" code={`const res = await fetch("/api/v1/tts/generate", {
  method: "POST",
  headers: {
    "Authorization": "Bearer vox_sk_test_YOUR_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    text: "Xin chào thế giới",
    language: "vi"
  })
});
const { ok, data, error } = await res.json();
if (ok) {
  console.log("Audio URL:", data.audio_url);
}`} />
                </CollapsibleExample>
            </SectionCard>

            {/* ---- POST /api/v1/tts/stream-token ---- */}
            <SectionCard id="stream-token" icon={<Key size={20} />} title="Request Stream Token">
                <EndpointHeader method="POST" path="/api/v1/tts/stream-token" desc="Request a short-lived JWT token for WebSocket streaming. Quota is deducted upfront based on text_length." />

                <h3 className="text-sm font-bold text-vox-heading mt-4">Request Body (JSON)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead><tr className="border-b border-vox-outline/20 text-xs text-vox-text-dim uppercase">
                            <th className="py-2 pr-3">Param</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Required</th><th className="py-2">Description</th>
                        </tr></thead>
                        <tbody>
                            <ParamRow name="text_length" type="number" required desc="Number of characters you intend to stream. Must be > 0 and ≤ 10000. This amount is pre-deducted from your quota." />
                        </tbody>
                    </table>
                </div>

                <h3 className="text-sm font-bold text-vox-heading">Success Response (200)</h3>
                <CopyBlock language="json" code={`{
  "ok": true,
  "data": {
    "stream_token": "eyJhbGciOiJIUzI1NiIs...",
    "ws_url": "ws://127.0.0.1:8808/ws/tts/stream",
    "max_length": 500,
    "chars_deducted": 500,
    "expires_in": 60
  }
}`} />

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-200">
                    <p className="font-semibold text-amber-300 mb-1">⚠️ Token expires in 60 seconds</p>
                    <p className="text-vox-text">The stream token is a short-lived JWT. You must open the WebSocket connection within 60 seconds of receiving the token.</p>
                </div>

                <CollapsibleExample title="cURL Example">
                    <CopyBlock code={`curl -X POST https://your-domain.com/api/v1/tts/stream-token \\
  -H "Authorization: Bearer vox_sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "text_length": 500 }'`} />
                </CollapsibleExample>
            </SectionCard>

            {/* ---- WebSocket Streaming ---- */}
            <SectionCard id="streaming" icon={<Zap size={20} />} title="WebSocket Streaming Flow">
                <EndpointHeader method="WS" path="/ws/tts/stream?token=<stream_token>" desc="Real-time TTS streaming via WebSocket. Connect directly to the FastAPI backend." />

                <h3 className="text-sm font-bold text-vox-heading mt-4">Connection Flow</h3>
                <div className="space-y-3">
                    {[
                        { step: 1, title: "Get stream token", desc: "Call POST /api/v1/tts/stream-token to get a JWT token and ws_url." },
                        { step: 2, title: "Open WebSocket", desc: "Connect to ws_url with ?token=<stream_token> query parameter." },
                        { step: 3, title: 'Send "start" message', desc: "Send a JSON message with text and voice parameters to begin streaming." },
                        { step: 4, title: "Receive audio chunks", desc: "Receive binary audio data (WAV/PCM) as the model generates speech in real-time." },
                        { step: 5, title: "Handle completion", desc: 'The server sends a JSON message with status "done" or "error" when finished.' },
                    ].map(s => (
                        <div key={s.step} className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-vox-primary/15 text-vox-primary flex items-center justify-center text-sm font-bold flex-shrink-0">{s.step}</div>
                            <div>
                                <p className="text-sm font-semibold text-vox-heading">{s.title}</p>
                                <p className="text-sm text-vox-text-dim">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <h3 className="text-sm font-bold text-vox-heading mt-4">Start Message Format</h3>
                <CopyBlock language="json" code={`{
  "text": "Your text to synthesize",
  "language": "auto",
  "cfg_value": 2.0,
  "dit_steps": 6,
  "control_instruction": ""
}`} />

                <CollapsibleExample title="JavaScript WebSocket Example">
                    <CopyBlock language="javascript" code={`// Step 1: Get stream token
const tokenRes = await fetch("/api/v1/tts/stream-token", {
  method: "POST",
  headers: {
    "Authorization": "Bearer vox_sk_test_YOUR_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ text_length: 100 })
});
const { data } = await tokenRes.json();

// Step 2: Open WebSocket
const ws = new WebSocket(data.ws_url + "?token=" + data.stream_token);

// Step 3: Send start message when connected
ws.onopen = () => {
  ws.send(JSON.stringify({
    text: "Xin chào thế giới",
    language: "vi"
  }));
};

// Step 4: Receive audio chunks
ws.onmessage = (event) => {
  if (event.data instanceof Blob) {
    // Binary audio data — append to audio buffer
    console.log("Received audio chunk:", event.data.size, "bytes");
  } else {
    // JSON status message
    const msg = JSON.parse(event.data);
    console.log("Status:", msg.status); // "done" or "error"
  }
};`} />
                </CollapsibleExample>
            </SectionCard>

            {/* ---- GET /api/v1/usage ---- */}
            <SectionCard id="usage" icon={<BarChart3 size={20} />} title="Check Usage & Quota">
                <EndpointHeader method="GET" path="/api/v1/usage" desc="Check your current quota usage and limits." />

                <h3 className="text-sm font-bold text-vox-heading mt-4">Success Response (200)</h3>
                <CopyBlock language="json" code={`{
  "ok": true,
  "data": {
    "environment": "test",
    "limit": 500000,
    "used": 1234,
    "remaining": 498766,
    "reset_date": "2026-06-01T00:00:00.000Z"
  }
}`} />

                <CollapsibleExample title="cURL Example">
                    <CopyBlock code={`curl https://your-domain.com/api/v1/usage \\
  -H "Authorization: Bearer vox_sk_test_YOUR_KEY"`} />
                </CollapsibleExample>
            </SectionCard>

            {/* ---- Quota ---- */}
            <SectionCard id="quota" icon={<BarChart3 size={20} />} title="Quota & Limits">
                <div className="space-y-3 text-sm text-vox-text leading-relaxed">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">Charging Model</p>
                            <p className="font-semibold text-vox-heading">Upfront deduction</p>
                            <p className="text-xs text-vox-text-dim mt-1">Quota is deducted at request time based on input text length (characters).</p>
                        </div>
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">Reset Cycle</p>
                            <p className="font-semibold text-vox-heading">Monthly (1st of each month)</p>
                            <p className="text-xs text-vox-text-dim mt-1">Usage counter resets automatically on the first day of each month.</p>
                        </div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <p className="font-semibold text-amber-300 mb-1">⚠️ No refund on downstream failure (MVP)</p>
                        <p className="text-vox-text">If the TTS backend fails after quota has been deducted, the characters are not refunded. This is a known MVP limitation.</p>
                    </div>
                    <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                        <p className="text-xs text-vox-text-dim mb-1">Stream Token: max_length</p>
                        <p className="text-vox-text">The <code className="font-mono text-xs bg-vox-surface px-1 rounded">max_length</code> claim in the stream token prevents sending text longer than the amount you pre-paid for. Maximum value: <code className="font-mono text-xs">10,000</code> characters per token.</p>
                    </div>
                </div>
            </SectionCard>

            {/* ---- Errors ---- */}
            <SectionCard id="errors" icon={<Server size={20} />} title="Error Handling">
                <p className="text-sm text-vox-text mb-4">All errors follow a consistent envelope format:</p>
                <CopyBlock language="json" code={`{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}`} />

                <h3 className="text-sm font-bold text-vox-heading mt-4">Common Error Codes</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead><tr className="border-b border-vox-outline/20 text-xs text-vox-text-dim uppercase">
                            <th className="py-2 pr-3">HTTP</th><th className="py-2 pr-3">Code</th><th className="py-2">Description</th>
                        </tr></thead>
                        <tbody className="text-vox-text">
                            <tr className="border-b border-vox-outline/10"><td className="py-2 pr-3 font-mono">400</td><td className="py-2 pr-3"><code className="text-xs">BAD_REQUEST</code></td><td className="py-2">Missing or invalid parameters</td></tr>
                            <tr className="border-b border-vox-outline/10"><td className="py-2 pr-3 font-mono">401</td><td className="py-2 pr-3"><code className="text-xs">UNAUTHORIZED</code></td><td className="py-2">Missing, invalid, or expired API key</td></tr>
                            <tr className="border-b border-vox-outline/10"><td className="py-2 pr-3 font-mono">403</td><td className="py-2 pr-3"><code className="text-xs">FORBIDDEN</code></td><td className="py-2">Key revoked, expired, or missing required scope</td></tr>
                            <tr className="border-b border-vox-outline/10"><td className="py-2 pr-3 font-mono">403</td><td className="py-2 pr-3"><code className="text-xs">QUOTA_EXCEEDED</code></td><td className="py-2">Not enough quota remaining</td></tr>
                            <tr className="border-b border-vox-outline/10"><td className="py-2 pr-3 font-mono">500</td><td className="py-2 pr-3"><code className="text-xs">BACKEND_ERROR</code></td><td className="py-2">TTS backend processing failed</td></tr>
                            <tr><td className="py-2 pr-3 font-mono">500</td><td className="py-2 pr-3"><code className="text-xs">INTERNAL_ERROR</code></td><td className="py-2">Server configuration or unexpected error</td></tr>
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* Footer note */}
            <div className="bg-vox-surface-low border border-vox-outline/10 rounded-2xl p-6 text-center text-sm text-vox-text-dim">
                <p>Internal web routes (<code className="font-mono text-xs">/api/keys/*</code>, <code className="font-mono text-xs">/api/history/*</code>) are not part of the public developer API.</p>
                <p className="mt-1">For questions or issues, contact the project maintainer.</p>
            </div>
        </div>
    );
}
