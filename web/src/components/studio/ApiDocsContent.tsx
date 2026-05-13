"use client";

import { useState } from "react";
import { Play, Server, Key, BarChart3, Zap, ArrowLeft, TerminalSquare, Globe, Code2, Wifi } from "lucide-react";
import Link from "next/link";
import {
    CopyBlock, ParamRow, SectionCard, EndpointHeader,
    CollapsibleExample, InfoBox, WarningBox, StepList, ParamTable, ErrorTable,
} from "./docs/DocsComponents";
import * as EX from "./docs/DocsExamples";

export default function ApiDocsContent() {
    const NAV = [
        { id: "quick-start", label: "Quick Start" },
        { id: "overview", label: "Overview" },
        { id: "auth", label: "Authentication" },
        { id: "generate", label: "Generate Speech" },
        { id: "stream-token", label: "Stream Token" },
        { id: "ws-streaming", label: "WebSocket Streaming" },
        { id: "usage", label: "Usage & Quota" },
        { id: "errors", label: "Error Codes" },
        { id: "examples", label: "Code Examples" },
        { id: "troubleshooting", label: "Troubleshooting" },
    ];

    const [activeSection, setActiveSection] = useState("quick-start");
    const handleNavClick = (id: string) => { setActiveSection(id); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

    return (
        <div className="flex gap-8">
            {/* Sidebar */}
            <nav className="hidden lg:block w-56 flex-shrink-0 sticky top-24 self-start">
                <div className="bg-vox-surface border border-vox-outline/20 rounded-2xl p-4 space-y-1">
                    <p className="text-xs text-vox-text-dim uppercase tracking-wider font-bold mb-3 px-2">Navigation</p>
                    {NAV.map(n => (
                        <button key={n.id} onClick={() => handleNavClick(n.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeSection === n.id ? "bg-vox-primary/10 text-vox-primary font-semibold" : "text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface-low"}`}>
                            {n.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main */}
            <div className="flex-1 space-y-8 min-w-0">
                {/* Header */}
                <header>
                    <Link href="/studio/developer" className="inline-flex items-center gap-1.5 text-sm text-vox-text-dim hover:text-vox-primary transition-colors mb-4">
                        <ArrowLeft size={16} /> Back to API Console
                    </Link>
                    <h1 className="text-3xl font-bold text-vox-heading tracking-tight">API Documentation</h1>
                    <p className="text-vox-text-dim mt-2 text-lg">VoxCPM Voice Clone TTS API v1</p>
                    <div className="flex gap-2 mt-4">
                        <Link href="/studio/playground" className="inline-flex items-center gap-2 px-4 py-2 bg-vox-secondary/10 border border-vox-secondary/20 text-vox-secondary rounded-xl text-sm font-semibold hover:bg-vox-secondary/20 transition-colors">
                            <TerminalSquare size={16} /> Test in Playground
                        </Link>
                    </div>
                </header>

                {/* Mobile nav */}
                <nav className="lg:hidden bg-vox-surface border border-vox-outline/20 rounded-2xl p-4 flex flex-wrap gap-2">
                    {NAV.map(n => (<a key={n.id} href={`#${n.id}`} className="px-3 py-1.5 rounded-lg text-sm text-vox-text-dim hover:text-vox-heading hover:bg-vox-primary/10 transition-colors">{n.label}</a>))}
                </nav>

                {/* ── Quick Start ── */}
                <SectionCard id="quick-start" icon={<Play size={20} />} title="Quick Start">
                    <p className="text-vox-text leading-relaxed">Get started with VoxCPM TTS in 3 steps. Each API key is bound to a specific cloned voice &mdash; you never need to pass <code className="text-xs bg-vox-surface px-1 py-0.5 rounded font-mono">voice_id</code>.</p>
                    <StepList steps={[
                        { title: "Create a voice & get an API key", desc: "Upload audio in the Voice Library, then click \"Create API Key\" on any voice card. The key is shown only once — save it." },
                        { title: "Configure your base URL", desc: "Local development: http://127.0.0.1:3000 — Production: https://api.yourdomain.com. All endpoints are relative to this URL." },
                        { title: "Make your first API call", desc: "Use the cURL command below, or copy any example from the Code Examples section." },
                    ]} />
                    <CopyBlock code={`# Replace BASE_URL and API key with your values
curl -X POST http://127.0.0.1:3000/api/v1/tts/generate \\
  -H "Authorization: Bearer vc_sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hello world!", "language": "auto", "format": "mp3"}'`} />
                    <InfoBox>
                        <p className="font-semibold text-vox-heading mb-1">💡 No voice_id needed</p>
                        <p className="text-vox-text-dim">Each API key is permanently linked to one cloned voice. The server resolves the voice automatically from your key. To use a different voice, create a separate API key.</p>
                    </InfoBox>
                </SectionCard>

                {/* ── Overview ── */}
                <SectionCard id="overview" icon={<Globe size={20} />} title="Overview">
                    <p className="text-vox-text leading-relaxed">The VoxCPM API provides high-quality Text-to-Speech generation with voice cloning. Every voice clone has a dedicated API key for security and usage tracking.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">Base URL (Local)</p>
                            <code className="text-sm font-mono text-vox-heading">http://127.0.0.1:3000</code>
                        </div>
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">Content Type</p>
                            <code className="text-sm font-mono text-vox-heading">application/json</code>
                        </div>
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">Key Format</p>
                            <code className="text-sm font-mono text-vox-heading">vc_sk_live_xxx</code>
                        </div>
                    </div>
                    <h3 className="text-sm font-bold text-vox-heading mt-2">Available Endpoints</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead><tr className="border-b border-vox-outline/20 text-xs text-vox-text-dim uppercase">
                                <th className="py-2 pr-3">Method</th><th className="py-2 pr-3">Endpoint</th><th className="py-2">Description</th>
                            </tr></thead>
                            <tbody className="text-vox-text">
                                <tr className="border-b border-vox-outline/10"><td className="py-2.5 pr-3"><code className="text-xs text-blue-400">POST</code></td><td className="py-2.5 pr-3 font-mono text-xs">/api/v1/tts/generate</td><td className="py-2.5">Generate speech from text (blocking)</td></tr>
                                <tr className="border-b border-vox-outline/10"><td className="py-2.5 pr-3"><code className="text-xs text-blue-400">POST</code></td><td className="py-2.5 pr-3 font-mono text-xs">/api/v1/tts/stream-token</td><td className="py-2.5">Get a one-time token for WebSocket streaming</td></tr>
                                <tr className="border-b border-vox-outline/10"><td className="py-2.5 pr-3"><code className="text-xs text-purple-400">WS</code></td><td className="py-2.5 pr-3 font-mono text-xs">/ws/tts/stream?token=...</td><td className="py-2.5">Real-time streaming via WebSocket</td></tr>
                                <tr><td className="py-2.5 pr-3"><code className="text-xs text-green-400">GET</code></td><td className="py-2.5 pr-3 font-mono text-xs">/api/v1/usage</td><td className="py-2.5">Check quota and usage</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <InfoBox>
                        <p className="font-semibold text-vox-heading mb-1">🔗 Dynamic Base URL</p>
                        <p className="text-vox-text-dim">All examples use a configurable base URL. For local dev use <code className="font-mono text-xs">http://127.0.0.1:3000</code>. For production, replace with your deployed domain. The Test app sidebar lets you change this at runtime.</p>
                    </InfoBox>
                </SectionCard>

                {/* ── Authentication ── */}
                <SectionCard id="auth" icon={<Key size={20} />} title="Authentication">
                    <p className="text-vox-text leading-relaxed">All API requests require a <code className="font-mono text-xs">Bearer</code> token in the <code className="font-mono text-xs">Authorization</code> header. Generate keys from the <Link href="/studio/developer" className="text-vox-primary hover:underline">API Console</Link> or from voice cards in the <Link href="/studio/voices" className="text-vox-primary hover:underline">Voice Library</Link>.</p>
                    <CopyBlock language="http" code={`Authorization: Bearer vc_sk_live_xxxxx\nContent-Type: application/json`} />
                    <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10 space-y-2 text-sm">
                        <p className="font-semibold text-vox-heading">Key anatomy</p>
                        <p className="text-vox-text font-mono text-xs">vc_sk_live_&lt;random_base64url&gt;</p>
                        <p className="text-vox-text-dim"><code className="font-mono text-xs">vc</code> = Voice Clone · <code className="font-mono text-xs">sk</code> = Secret Key · <code className="font-mono text-xs">live</code> = Production</p>
                    </div>
                    <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10 space-y-2 text-sm">
                        <p className="font-semibold text-vox-heading">Scopes</p>
                        <p className="text-vox-text-dim">Each key includes scopes that control access. Default scopes: <code className="font-mono text-xs">tts.generate</code>, <code className="font-mono text-xs">tts.stream</code>, <code className="font-mono text-xs">usage.read</code></p>
                    </div>
                    <WarningBox title="Security">
                        <p>Your API key is shown <strong>only once</strong> when created. We store only a SHA-256 hash. If lost, revoke and regenerate. Never expose keys in client-side code.</p>
                    </WarningBox>
                </SectionCard>

                {/* ── Generate Speech ── */}
                <SectionCard id="generate" icon={<Zap size={20} />} title="Generate Speech">
                    <EndpointHeader method="POST" path="/api/v1/tts/generate" desc="Generate audio from text using your cloned voice. Voice is automatically resolved from the API key." />
                    <h3 className="text-sm font-bold text-vox-heading mt-4">Request Body (JSON)</h3>
                    <ParamTable>
                        <ParamRow name="text" type="string" required desc="Text to synthesize into speech (max 5,000 chars)." />
                        <ParamRow name="language" type="string" desc="Language hint: vi, en, zh, ja, ko, fr, de, es." def='"auto"' />
                        <ParamRow name="format" type="string" desc='Output format: "mp3" or "wav".' def='"mp3"' />
                        <ParamRow name="speed" type="number" desc="Playback speed multiplier (0.5–2.0)." def="1.0" />
                        <ParamRow name="control_instruction" type="string" desc="Voice style/prosody control. Example: Young female, warm and gentle." def='""' />
                        <ParamRow name="cfg_value" type="number" desc="Classifier-free guidance scale (0.1–10.0). Higher = closer to reference voice." def="2.0" />
                        <ParamRow name="dit_steps" type="number" desc="DiT inference steps (1–50). More steps = better quality but slower." def="6" />
                    </ParamTable>
                    <h3 className="text-sm font-bold text-vox-heading">Example Request</h3>
                    <CopyBlock code={EX.CURL_GENERATE} />
                    <h3 className="text-sm font-bold text-vox-heading">Success Response (200)</h3>
                    <CopyBlock language="json" code={EX.RESPONSE_GENERATE} />
                    <h3 className="text-sm font-bold text-vox-heading">Error Response</h3>
                    <CopyBlock language="json" code={EX.RESPONSE_ERROR} />
                </SectionCard>

                {/* ── Stream Token ── */}
                <SectionCard id="stream-token" icon={<Key size={20} />} title="Stream Token">
                    <EndpointHeader method="POST" path="/api/v1/tts/stream-token" desc="Get a short-lived JWT token for WebSocket streaming. Quota is deducted upfront based on text_length." />
                    <ParamTable>
                        <ParamRow name="text_length" type="number" required desc="Number of characters you plan to stream. Must be > 0 and ≤ 10,000. Quota is deducted immediately." />
                    </ParamTable>
                    <h3 className="text-sm font-bold text-vox-heading">Example Request</h3>
                    <CopyBlock code={EX.CURL_STREAM_TOKEN} />
                    <h3 className="text-sm font-bold text-vox-heading">Success Response (200)</h3>
                    <CopyBlock language="json" code={EX.RESPONSE_STREAM_TOKEN} />
                    <InfoBox>
                        <p className="font-semibold text-vox-heading mb-1">⏱️ Token Expiry</p>
                        <p className="text-vox-text-dim">Stream tokens expire in <strong>60 seconds</strong>. Connect to the WebSocket immediately after receiving the token. The <code className="font-mono text-xs">ws_url</code> in the response points directly to the backend WebSocket endpoint.</p>
                    </InfoBox>
                </SectionCard>

                {/* ── WebSocket Streaming ── */}
                <SectionCard id="ws-streaming" icon={<Wifi size={20} />} title="WebSocket Streaming">
                    <EndpointHeader method="WS" path="/ws/tts/stream?token=<stream_token>" desc="Real-time TTS streaming. Sends PCM16 audio chunks as they are generated." />
                    <h3 className="text-sm font-bold text-vox-heading mt-4">Connection Flow</h3>
                    <StepList steps={[
                        { title: "Get a stream token", desc: "POST /api/v1/tts/stream-token with your API key. Save the stream_token and ws_url." },
                        { title: "Open WebSocket", desc: "Connect to ws_url with ?token=<stream_token> query parameter." },
                        { title: "Send \"start\" message", desc: "Send a JSON message with type, text, and voice parameters to begin streaming." },
                        { title: "Receive audio chunks", desc: "Binary frames contain raw PCM16 audio data. Text frames contain JSON status events." },
                        { title: "Handle completion", desc: "Server sends {type: \"done\"} with audio_url when complete, or {type: \"error\"} on failure." },
                    ]} />
                    <h3 className="text-sm font-bold text-vox-heading">Start Message Format</h3>
                    <CopyBlock language="json" code={EX.WS_START_MSG} />
                    <h3 className="text-sm font-bold text-vox-heading">Server Events</h3>
                    <CopyBlock language="javascript" code={EX.WS_EVENTS} />
                    <InfoBox>
                        <p className="font-semibold text-vox-heading mb-1">🔊 Real-time Playback</p>
                        <p className="text-vox-text-dim">Audio chunks are PCM16 little-endian at the sample rate specified in the <code className="font-mono text-xs">start</code> event (typically 24000 Hz). Use Web Audio API to play chunks as they arrive for low-latency playback. See the JavaScript WebSocket example in Code Examples.</p>
                    </InfoBox>
                </SectionCard>

                {/* ── Usage & Quota ── */}
                <SectionCard id="usage" icon={<BarChart3 size={20} />} title="Usage & Quota">
                    <EndpointHeader method="GET" path="/api/v1/usage" desc="Check your current quota usage, limits, and reset date." />
                    <h3 className="text-sm font-bold text-vox-heading mt-4">Example Request</h3>
                    <CopyBlock code={EX.CURL_USAGE} />
                    <h3 className="text-sm font-bold text-vox-heading">Success Response (200)</h3>
                    <CopyBlock language="json" code={EX.RESPONSE_USAGE} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">Charging</p>
                            <p className="font-semibold text-vox-heading text-sm">Per-character</p>
                            <p className="text-xs text-vox-text-dim mt-1">Deducted at request time based on input text length.</p>
                        </div>
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">Rate Limit</p>
                            <p className="font-semibold text-vox-heading text-sm">100 req/min per key</p>
                            <p className="text-xs text-vox-text-dim mt-1">Each API key has independent rate limiting.</p>
                        </div>
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">Reset</p>
                            <p className="font-semibold text-vox-heading text-sm">Monthly (1st)</p>
                            <p className="text-xs text-vox-text-dim mt-1">Counter resets automatically on the 1st of each month.</p>
                        </div>
                    </div>
                </SectionCard>

                {/* ── Error Codes ── */}
                <SectionCard id="errors" icon={<Server size={20} />} title="Error Codes">
                    <p className="text-sm text-vox-text mb-2">All errors follow a consistent JSON envelope:</p>
                    <CopyBlock language="json" code={EX.RESPONSE_ERROR} />
                    <h3 className="text-sm font-bold text-vox-heading mt-2">Error Code Reference</h3>
                    <ErrorTable />
                </SectionCard>

                {/* ── Code Examples ── */}
                <SectionCard id="examples" icon={<Code2 size={20} />} title="Code Examples">
                    <InfoBox>
                        <p className="text-vox-text-dim">All examples use a <strong>configurable base URL</strong>. Replace <code className="font-mono text-xs">BASE_URL</code> with <code className="font-mono text-xs">http://127.0.0.1:3000</code> for local dev or your production URL.</p>
                    </InfoBox>

                    <CollapsibleExample title="cURL — Generate Speech" defaultOpen>
                        <CopyBlock code={EX.CURL_GENERATE} />
                    </CollapsibleExample>
                    <CollapsibleExample title="cURL — Check Quota">
                        <CopyBlock code={EX.CURL_USAGE} />
                    </CollapsibleExample>
                    <CollapsibleExample title="cURL — Get Stream Token">
                        <CopyBlock code={EX.CURL_STREAM_TOKEN} />
                    </CollapsibleExample>
                    <CollapsibleExample title="Python — Generate Speech">
                        <CopyBlock language="python" code={EX.PYTHON_GENERATE} />
                    </CollapsibleExample>
                    <CollapsibleExample title="Python — WebSocket Streaming (Full Flow)">
                        <CopyBlock language="python" code={EX.PYTHON_WEBSOCKET} />
                    </CollapsibleExample>
                    <CollapsibleExample title="JavaScript — Generate Speech">
                        <CopyBlock language="javascript" code={EX.JS_GENERATE} />
                    </CollapsibleExample>
                    <CollapsibleExample title="JavaScript — WebSocket Streaming with Real-time Playback">
                        <CopyBlock language="javascript" code={EX.JS_WEBSOCKET} />
                    </CollapsibleExample>
                </SectionCard>

                {/* ── Troubleshooting ── */}
                <SectionCard id="troubleshooting" icon={<Server size={20} />} title="Troubleshooting">
                    <div className="space-y-4">
                        {[
                            { q: "401 — Missing or invalid Authorization Bearer token", a: "Ensure your request includes the header: Authorization: Bearer vc_sk_live_xxx. The key must be active and not revoked." },
                            { q: "403 — Missing required scope: tts.generate", a: "Your API key doesn't have the required permission. Keys created via the UI include all scopes by default. If you created the key manually, ensure it includes tts.generate, tts.stream, and usage.read." },
                            { q: "403 — QUOTA_EXCEEDED", a: "You've used all your monthly characters. Check GET /api/v1/usage to see remaining quota. Quota resets on the 1st of each month." },
                            { q: "500 — TTS generation failed: No such file or directory", a: "The backend's .runtime/uploads or .runtime/outputs directory is missing. Create them: mkdir -p .runtime/uploads .runtime/outputs" },
                            { q: "500 — BACKEND_ERROR / fetch failed", a: "The TTS backend (port 8808) is not running or crashed. Start it with: export TTS_INTERNAL_SECRET=\"dev-internal-secret-change-me\" && python3 app.py --port 8808" },
                            { q: "WebSocket closes immediately", a: "Stream token may be expired (60s TTL). Request a fresh token via POST /api/v1/tts/stream-token and connect immediately." },
                            { q: "No audio playback in browser", a: "Web Audio API requires a user gesture before playing. Ensure you call audioContext.resume() after a click event. Also verify the sample rate matches the start event (typically 24000)." },
                        ].map((item, i) => (
                            <div key={i} className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                                <p className="text-sm font-semibold text-vox-heading mb-1">{item.q}</p>
                                <p className="text-sm text-vox-text-dim">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* Footer CTA */}
                <div className="bg-vox-surface border border-vox-outline/20 rounded-2xl p-8 text-center">
                    <h3 className="text-lg font-bold text-vox-heading mb-2">Ready to build?</h3>
                    <p className="text-sm text-vox-text-dim mb-4">Test your API keys live in the Playground, or head to the API Console to manage voices and keys.</p>
                    <div className="flex items-center justify-center gap-3">
                        <Link href="/studio/playground" className="inline-flex items-center gap-2 px-5 py-2.5 bg-vox-primary text-white rounded-xl text-sm font-semibold hover:bg-vox-primary/90 transition-colors">
                            <TerminalSquare size={16} /> Test in Playground
                        </Link>
                        <Link href="/studio/developer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-vox-surface-low border border-vox-outline/20 text-vox-heading rounded-xl text-sm font-semibold hover:bg-vox-surface-high transition-colors">
                            <Key size={16} /> API Console
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
