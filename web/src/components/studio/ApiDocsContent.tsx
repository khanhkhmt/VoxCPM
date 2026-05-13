"use client";

import { useState } from "react";
import { Copy, Check, Zap, Server, Key, BarChart3, ArrowLeft, ChevronDown, ChevronRight, AlertTriangle, TerminalSquare, Play } from "lucide-react";
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
        <div className="relative group rounded-xl overflow-hidden border border-vox-outline/20 bg-[#1a1b26]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#13141c] border-b border-vox-outline/10 text-xs text-gray-400 font-mono">
                <span>{language}</span>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
                    {copied ? <><Check size={14} className="text-green-400" /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-300 leading-relaxed whitespace-pre">{code}</pre>
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
            <p className="text-xs text-vox-text-dim">Auth: <code className="bg-vox-surface-low px-1.5 py-0.5 rounded">Authorization: Bearer &lt;VOICE_API_KEY&gt;</code></p>
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
/*  Main component with sidebar layout                                */
/* ------------------------------------------------------------------ */

export default function ApiDocsContent() {
    const NAV = [
        { id: "quick-start", label: "Quick Start" },
        { id: "overview", label: "Overview" },
        { id: "auth", label: "Authentication" },
        { id: "generate", label: "POST /v1/tts/generate" },
        { id: "blocking", label: "Blocking Response" },
        { id: "streaming", label: "Streaming Response" },
        { id: "stream-token", label: "POST /tts/stream-token" },
        { id: "ws-streaming", label: "WebSocket Streaming" },
        { id: "usage", label: "GET /usage" },
        { id: "errors", label: "Error Codes" },
        { id: "examples", label: "Code Examples" },
        { id: "quota", label: "Quota & Limits" },
    ];

    const [activeSection, setActiveSection] = useState("overview");

    const handleNavClick = (id: string) => {
        setActiveSection(id);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="flex gap-8">
            {/* Sidebar Navigation */}
            <nav className="hidden lg:block w-56 flex-shrink-0 sticky top-24 self-start">
                <div className="bg-vox-surface border border-vox-outline/20 rounded-2xl p-4 space-y-1">
                    <p className="text-xs text-vox-text-dim uppercase tracking-wider font-bold mb-3 px-2">Navigation</p>
                    {NAV.map(n => (
                        <button
                            key={n.id}
                            onClick={() => handleNavClick(n.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                activeSection === n.id
                                    ? "bg-vox-primary/10 text-vox-primary font-semibold"
                                    : "text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface-low"
                            }`}
                        >
                            {n.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex-1 space-y-8 min-w-0">
                {/* Header */}
                <header className="flex items-center justify-between">
                    <div>
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
                    </div>
                </header>

                {/* Mobile Quick nav */}
                <nav className="lg:hidden bg-vox-surface border border-vox-outline/20 rounded-2xl p-4 flex flex-wrap gap-2">
                    {NAV.map(n => (
                        <a key={n.id} href={`#${n.id}`} className="px-3 py-1.5 rounded-lg text-sm text-vox-text-dim hover:text-vox-heading hover:bg-vox-primary/10 transition-colors">{n.label}</a>
                    ))}
                </nav>

                {/* ---- Quick Start ---- */}
                <SectionCard id="quick-start" icon={<Play size={20} />} title="Quick Start">
                    <p className="text-vox-text leading-relaxed mb-4">
                        Get started with VoxCPM TTS in under a minute. Each voice clone has its own API key &mdash;
                        you do not need to pass <code className="text-xs bg-vox-surface px-1 py-0.5 rounded font-mono">voice_id</code>.
                        The server automatically detects the voice from the API key.
                    </p>
                    <div className="space-y-4">
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-vox-primary/15 text-vox-primary flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-vox-heading">Create a voice &amp; get an API key</p>
                                <p className="text-sm text-vox-text-dim">Upload a voice in the <Link href="/studio/voices" className="text-vox-primary hover:underline">Voice Library</Link>, then click &ldquo;Create API Key&rdquo; on any voice card.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-vox-primary/15 text-vox-primary flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-vox-heading">Make your first API call</p>
                                <p className="text-sm text-vox-text-dim mb-3">Use this cURL command to generate speech:</p>
                                <CopyBlock code={`curl -X POST ${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/v1/tts/generate \\
  -H "Authorization: Bearer vc_sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hello world!", "mode": "blocking"}'`} />
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-vox-primary/15 text-vox-primary flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-vox-heading">Play the audio</p>
                                <p className="text-sm text-vox-text-dim">The response includes an <code className="text-xs bg-vox-surface px-1 py-0.5 rounded font-mono">audio_url</code> you can stream or download. Or use the <Link href="/studio/playground" className="text-vox-primary hover:underline">Playground</Link> to test interactively.</p>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* ---- Overview ---- */}
                <SectionCard id="overview" icon={<Server size={20} />} title="Overview">
                    <p className="text-vox-text leading-relaxed">
                        The VoxCPM API provides programmatic access to high-quality Text-to-Speech generation using your cloned voices.
                        Each voice clone has its own unique API key for enhanced security and usage tracking.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">API Server URL</p>
                            <code className="text-sm font-mono text-vox-heading break-all">https://api.yourdomain.com/v1</code>
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
                    <div className="bg-vox-primary/5 border border-vox-primary/20 rounded-xl p-4 text-sm mt-2">
                        <p className="font-semibold text-vox-heading mb-1">Per-Voice API Keys</p>
                        <p className="text-vox-text-dim">
                            Each API key is bound to a single voice clone. When you call the TTS API, the voice is automatically
                            determined from the API key — no need to specify <code className="font-mono text-xs">voice_id</code> in the request.
                        </p>
                    </div>
                </SectionCard>

                {/* ---- Authentication ---- */}
                <SectionCard id="auth" icon={<Key size={20} />} title="Authentication">
                    <p className="text-vox-text leading-relaxed">
                        All API requests must include your voice API key in the header.
                        Generate keys from the <Link href="/studio/developer" className="text-vox-primary hover:underline">API Console</Link> page
                        or from individual voice profiles in the <Link href="/studio/voices" className="text-vox-primary hover:underline">Voice Library</Link>.
                    </p>
                    <CopyBlock language="http" code={`Authorization: Bearer {VOICE_API_KEY}\nContent-Type: application/json`} />
                    <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10 space-y-2 text-sm">
                        <p className="font-semibold text-vox-heading">Key format</p>
                        <ul className="list-disc list-inside text-vox-text space-y-1 ml-2">
                            <li><code className="font-mono text-xs bg-vox-surface px-1 rounded">vc_sk_live_...</code> — Voice Clone Secret Key (Production)</li>
                        </ul>
                        <p className="text-vox-text-dim mt-2">
                            <code className="font-mono text-xs">vc</code> = Voice Clone,
                            <code className="font-mono text-xs ml-1">sk</code> = Secret Key,
                            <code className="font-mono text-xs ml-1">live</code> = Production
                        </p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm">
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-amber-300 mb-1">Security</p>
                                <p className="text-vox-text">API key is shown only once when generated. Store it securely — we only save the hash in our database.</p>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* ---- POST /v1/tts/generate ---- */}
                <SectionCard id="generate" icon={<Zap size={20} />} title="Generate Speech">
                    <EndpointHeader method="POST" path="/api/v1/tts/generate" desc="Generate audio from text using your cloned voice. The voice is automatically determined from your API key." />

                    <h3 className="text-sm font-bold text-vox-heading mt-4">Request Body (JSON)</h3>
                    <CopyBlock language="json" code={`{
  "text": "Xin chào, đây là bản clone giọng nói.",
  "language": "vi",
  "speed": 1.0,
  "format": "mp3",
  "mode": "blocking"
}`} />

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="border-b border-vox-outline/20 text-xs text-vox-text-dim uppercase">
                                <th className="py-2 pr-3">Param</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Required</th><th className="py-2">Description</th>
                            </tr></thead>
                            <tbody>
                                <ParamRow name="text" type="string" required desc="The text to synthesize into speech." />
                                <ParamRow name="language" type="string" desc="Language code (e.g. vi, en, zh, ja)." def='"auto"' />
                                <ParamRow name="speed" type="number" desc="Playback speed multiplier." def="1.0" />
                                <ParamRow name="format" type="string" desc='Output format: "mp3" or "wav".' def='"mp3"' />
                                <ParamRow name="mode" type="string" desc='"blocking" (wait for full audio) or "streaming" (chunked response).' def='"blocking"' />
                                <ParamRow name="control_instruction" type="string" desc="Prosody/style control instruction." def='""' />
                                <ParamRow name="cfg_value" type="number" desc="Classifier-free guidance scale." def="2.0" />
                                <ParamRow name="dit_steps" type="number" desc="Number of DiT inference steps." def="10" />
                            </tbody>
                        </table>
                    </div>
                </SectionCard>

                {/* ---- Blocking Response ---- */}
                <SectionCard id="blocking" icon={<Server size={20} />} title="Blocking Response">
                    <p className="text-sm text-vox-text-dim mb-4">Server processes the full request and returns the complete audio.</p>

                    <h3 className="text-sm font-bold text-vox-heading">Success Response</h3>
                    <CopyBlock language="json" code={`{
  "ok": true,
  "data": {
    "success": true,
    "request_id": "req_123456",
    "voice_id": "voice_abc123",
    "audio_url": "https://cdn.yourdomain.com/audio/file.mp3",
    "duration": 5.2,
    "status": "completed"
  }
}`} />

                    <h3 className="text-sm font-bold text-vox-heading mt-4">Error Response</h3>
                    <CopyBlock language="json" code={`{
  "ok": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API key is invalid"
  }
}`} />
                </SectionCard>

                {/* ---- Streaming Response ---- */}
                <SectionCard id="streaming" icon={<Zap size={20} />} title="Streaming Response">
                    <p className="text-sm text-vox-text-dim mb-4">Server returns audio in real-time chunks via Server-Sent Events.</p>
                    <CopyBlock language="http" code={`data: {"chunk_id": 1, "audio_chunk": "base64_data..."}\ndata: {"chunk_id": 2, "audio_chunk": "base64_data..."}\ndata: {"done": true}`} />
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
                                <ParamRow name="text_length" type="number" required desc="Number of characters you intend to stream. Must be > 0 and ≤ 10000." />
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
                </SectionCard>

                {/* ---- WebSocket Streaming ---- */}
                <SectionCard id="ws-streaming" icon={<Zap size={20} />} title="WebSocket Streaming Flow">
                    <EndpointHeader method="WS" path="/ws/tts/stream?token=<stream_token>" desc="Real-time TTS streaming via WebSocket." />

                    <h3 className="text-sm font-bold text-vox-heading mt-4">Connection Flow</h3>
                    <div className="space-y-3">
                        {[
                            { step: 1, title: "Get stream token", desc: "Call POST /api/v1/tts/stream-token to get a JWT token and ws_url." },
                            { step: 2, title: "Open WebSocket", desc: "Connect to ws_url with ?token=<stream_token> query parameter." },
                            { step: 3, title: 'Send "start" message', desc: "Send a JSON message with text and voice parameters to begin streaming." },
                            { step: 4, title: "Receive audio chunks", desc: "Receive binary audio data as the model generates speech in real-time." },
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
                </SectionCard>

                {/* ---- GET /api/v1/usage ---- */}
                <SectionCard id="usage" icon={<BarChart3 size={20} />} title="Check Usage & Quota">
                    <EndpointHeader method="GET" path="/api/v1/usage" desc="Check your current quota usage and limits." />

                    <h3 className="text-sm font-bold text-vox-heading mt-4">Success Response (200)</h3>
                    <CopyBlock language="json" code={`{
  "ok": true,
  "data": {
    "limit": 500000,
    "used": 1234,
    "remaining": 498766,
    "reset_date": "2026-06-01T00:00:00.000Z"
  }
}`} />
                </SectionCard>

                {/* ---- Error Codes ---- */}
                <SectionCard id="errors" icon={<Server size={20} />} title="Error Codes">
                    <p className="text-sm text-vox-text mb-4">All errors follow a consistent format:</p>
                    <CopyBlock language="json" code={`{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}`} />

                    <h3 className="text-sm font-bold text-vox-heading mt-4">Error Code Reference</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead><tr className="border-b border-vox-outline/20 text-xs text-vox-text-dim uppercase">
                                <th className="py-2 pr-3">Code</th><th className="py-2">Meaning</th>
                            </tr></thead>
                            <tbody className="text-vox-text">
                                <tr className="border-b border-vox-outline/10"><td className="py-2 pr-3"><code className="text-xs">INVALID_API_KEY</code></td><td className="py-2">API key is invalid, revoked, or expired</td></tr>
                                <tr className="border-b border-vox-outline/10"><td className="py-2 pr-3"><code className="text-xs">VOICE_NOT_FOUND</code></td><td className="py-2">Voice profile not found or deleted</td></tr>
                                <tr className="border-b border-vox-outline/10"><td className="py-2 pr-3"><code className="text-xs">RATE_LIMIT_EXCEEDED</code></td><td className="py-2">Too many requests or quota exceeded</td></tr>
                                <tr className="border-b border-vox-outline/10"><td className="py-2 pr-3"><code className="text-xs">TEXT_TOO_LONG</code></td><td className="py-2">Input text exceeds 5000 characters</td></tr>
                                <tr className="border-b border-vox-outline/10"><td className="py-2 pr-3"><code className="text-xs">BAD_REQUEST</code></td><td className="py-2">Missing or invalid parameters</td></tr>
                                <tr className="border-b border-vox-outline/10"><td className="py-2 pr-3"><code className="text-xs">BACKEND_ERROR</code></td><td className="py-2">TTS backend processing failed</td></tr>
                                <tr><td className="py-2 pr-3"><code className="text-xs">INTERNAL_ERROR</code></td><td className="py-2">Server configuration or unexpected error</td></tr>
                            </tbody>
                        </table>
                    </div>
                </SectionCard>

                {/* ---- Code Examples ---- */}
                <SectionCard id="examples" icon={<Zap size={20} />} title="Code Examples">
                    <h3 className="text-sm font-bold text-vox-heading">cURL</h3>
                    <CopyBlock code={`curl -X POST https://api.yourdomain.com/v1/tts/generate \\
  -H "Authorization: Bearer vc_sk_live_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Xin chào, đây là bản clone giọng nói.",
    "language": "vi",
    "speed": 1.0,
    "format": "mp3"
  }'`} />

                    <h3 className="text-sm font-bold text-vox-heading mt-6">Python</h3>
                    <CopyBlock language="python" code={`import requests

API_KEY = "vc_sk_live_xxxxx"
URL = "https://api.yourdomain.com/v1/tts/generate"

response = requests.post(
    URL,
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "text": "Xin chào, đây là bản clone giọng nói.",
        "language": "vi",
        "speed": 1.0,
        "format": "mp3",
    },
)

data = response.json()
if data.get("ok"):
    audio_url = data["data"]["audio_url"]
    print(f"Audio URL: {audio_url}")
else:
    print(f"Error: {data['error']['message']}")`} />

                    <h3 className="text-sm font-bold text-vox-heading mt-6">JavaScript / Node.js</h3>
                    <CopyBlock language="javascript" code={`const API_KEY = "vc_sk_live_xxxxx";
const URL = "https://api.yourdomain.com/v1/tts/generate";

const response = await fetch(URL, {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    text: "Xin chào, đây là bản clone giọng nói.",
    language: "vi",
    speed: 1.0,
    format: "mp3",
  }),
});

const { ok, data, error } = await response.json();
if (ok) {
  console.log("Audio URL:", data.audio_url);
} else {
  console.error("Error:", error.message);
}`} />

                    <CollapsibleExample title="Python Streaming Example">
                        <CopyBlock language="python" code={`import requests
import json

API_KEY = "vc_sk_live_xxxxx"

# Step 1: Get stream token
token_res = requests.post(
    "https://api.yourdomain.com/v1/tts/stream-token",
    headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    json={"text_length": 500},
)
token_data = token_res.json()["data"]

# Step 2: Connect via WebSocket
import websocket
ws = websocket.create_connection(
    f"{token_data['ws_url']}?token={token_data['stream_token']}"
)

# Step 3: Send text
ws.send(json.dumps({"text": "Xin chào thế giới", "language": "vi"}))

# Step 4: Receive audio chunks
while True:
    data = ws.recv()
    if isinstance(data, bytes):
        print(f"Received audio chunk: {len(data)} bytes")
    else:
        msg = json.loads(data)
        if msg.get("status") == "done":
            break
ws.close()`} />
                    </CollapsibleExample>

                    <CollapsibleExample title="JavaScript WebSocket Example">
                        <CopyBlock language="javascript" code={`// Step 1: Get stream token
const tokenRes = await fetch("/api/v1/tts/stream-token", {
  method: "POST",
  headers: {
    "Authorization": "Bearer vc_sk_live_xxxxx",
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
    console.log("Received audio chunk:", event.data.size, "bytes");
  } else {
    const msg = JSON.parse(event.data);
    console.log("Status:", msg.status);
  }
};`} />
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
                                <p className="text-xs text-vox-text-dim mb-1">Rate Limit</p>
                                <p className="font-semibold text-vox-heading">100 requests / minute per key</p>
                                <p className="text-xs text-vox-text-dim mt-1">Each voice API key has its own independent rate limit.</p>
                            </div>
                        </div>
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">Reset Cycle</p>
                            <p className="font-semibold text-vox-heading">Monthly (1st of each month)</p>
                            <p className="text-xs text-vox-text-dim mt-1">Usage counter resets automatically on the first day of each month.</p>
                        </div>
                    </div>
                </SectionCard>

                {/* Footer CTA */}
                <div className="bg-vox-surface border border-vox-outline/20 rounded-2xl p-8 text-center">
                    <h3 className="text-lg font-bold text-vox-heading mb-2">Ready to build?</h3>
                    <p className="text-sm text-vox-text-dim mb-4">Test your API keys live in the Playground or head to the API Console to manage your voices.</p>
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
