"use client";

import { useState } from "react";
import { Play, Server, Key, BarChart3, Zap, ArrowLeft, TerminalSquare, Globe, Code2, Wifi } from "lucide-react";
import Link from "next/link";
import {
    CopyBlock, ParamRow, SectionCard, EndpointHeader,
    CollapsibleExample, InfoBox, WarningBox, StepList, ParamTable, ErrorTable,
} from "./docs/DocsComponents";
import * as EX from "./docs/DocsExamples";
import { API_BASE_URL } from "@/lib/config";
import { useI18n } from "@/i18n";

export default function ApiDocsContent() {
    const { t } = useI18n();
    const NAV = [
        { id: "quick-start", label: t.apiDocs.nav.quickStart },
        { id: "overview", label: t.apiDocs.nav.overview },
        { id: "auth", label: t.apiDocs.nav.authentication },
        { id: "generate", label: t.apiDocs.nav.generateSpeech },
        { id: "stream-token", label: t.apiDocs.nav.streamToken },
        { id: "ws-streaming", label: t.apiDocs.nav.websocketStreaming },
        { id: "usage", label: t.apiDocs.nav.usageQuota },
        { id: "errors", label: t.apiDocs.nav.errorCodes },
        { id: "examples", label: t.apiDocs.nav.codeExamples },
        { id: "troubleshooting", label: t.apiDocs.nav.troubleshooting },
    ];

    const [activeSection, setActiveSection] = useState("quick-start");
    const handleNavClick = (id: string) => { setActiveSection(id); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

    return (
        <div className="flex gap-8">
            {/* Sidebar */}
            <nav className="hidden lg:block w-56 flex-shrink-0 sticky top-24 self-start">
                <div className="bg-vox-surface border border-vox-outline/20 rounded-2xl p-4 space-y-1">
                    <p className="text-xs text-vox-text-dim uppercase tracking-wider font-bold mb-3 px-2">{t.apiDocs.nav.navigation}</p>
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
                        <ArrowLeft size={16} /> {t.apiDocs.backToConsole}
                    </Link>
                    <h1 className="text-3xl font-bold text-vox-heading tracking-tight">{t.apiDocs.title}</h1>
                    <p className="text-vox-text-dim mt-2 text-lg">{t.apiDocs.versionLine}</p>
                    <div className="flex gap-2 mt-4">
                        <Link href="/studio/playground" className="inline-flex items-center gap-2 px-4 py-2 bg-vox-secondary/10 border border-vox-secondary/20 text-vox-secondary rounded-xl text-sm font-semibold hover:bg-vox-secondary/20 transition-colors">
                            <TerminalSquare size={16} /> {t.apiDocs.testInPlayground}
                        </Link>
                    </div>
                </header>

                {/* Mobile nav */}
                <nav className="lg:hidden bg-vox-surface border border-vox-outline/20 rounded-2xl p-4 flex flex-wrap gap-2">
                    {NAV.map(n => (<a key={n.id} href={`#${n.id}`} className="px-3 py-1.5 rounded-lg text-sm text-vox-text-dim hover:text-vox-heading hover:bg-vox-primary/10 transition-colors">{n.label}</a>))}
                </nav>

                {/* ── Quick Start ── */}
                <SectionCard id="quick-start" icon={<Play size={20} />} title={t.apiDocs.quickStart.title}>
                    <p className="text-vox-text leading-relaxed">{t.apiDocs.quickStart.description}</p>
                    <StepList steps={[
                        { title: t.apiDocs.quickStart.step1.title, desc: t.apiDocs.quickStart.step1.description },
                        { title: t.apiDocs.quickStart.step2.title, desc: `${t.apiDocs.quickStart.step2.description}${API_BASE_URL}${t.apiDocs.quickStart.step2.descriptionSuffix}` },
                        { title: t.apiDocs.quickStart.step3.title, desc: t.apiDocs.quickStart.step3.description },
                    ]} />
                    <CopyBlock code={`# Replace BASE_URL and API key with your values
curl -X POST ${API_BASE_URL}/api/v1/tts/generate \\
  -H "Authorization: Bearer vc_sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hello world!", "language": "auto", "format": "mp3"}'`} />
                    <InfoBox>
                        <p className="font-semibold text-vox-heading mb-1">💡 {t.apiDocs.quickStart.noVoiceId.title}</p>
                        <p className="text-vox-text-dim">{t.apiDocs.quickStart.noVoiceId.description}</p>
                    </InfoBox>
                </SectionCard>

                {/* ── Overview ── */}
                <SectionCard id="overview" icon={<Globe size={20} />} title={t.apiDocs.overview.title}>
                    <p className="text-vox-text leading-relaxed">{t.apiDocs.overview.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">{t.apiDocs.overview.baseUrl}</p>
                            <code className="text-sm font-mono text-vox-heading">{API_BASE_URL}</code>
                        </div>
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">{t.apiDocs.overview.contentType}</p>
                            <code className="text-sm font-mono text-vox-heading">application/json</code>
                        </div>
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">{t.apiDocs.overview.keyFormat}</p>
                            <code className="text-sm font-mono text-vox-heading">vc_sk_live_xxx</code>
                        </div>
                    </div>
                    <h3 className="text-sm font-bold text-vox-heading mt-2">{t.apiDocs.overview.availableEndpoints}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead><tr className="border-b border-vox-outline/20 text-xs text-vox-text-dim uppercase">
                                <th className="py-2 pr-3">{t.apiDocs.overview.table.method}</th><th className="py-2 pr-3">{t.apiDocs.overview.table.endpoint}</th><th className="py-2">{t.apiDocs.overview.table.description}</th>
                            </tr></thead>
                            <tbody className="text-vox-text">
                                <tr className="border-b border-vox-outline/10"><td className="py-2.5 pr-3"><code className="text-xs text-blue-400">POST</code></td><td className="py-2.5 pr-3 font-mono text-xs">/api/v1/tts/generate</td><td className="py-2.5">{t.apiDocs.overview.endpoint.generate}</td></tr>
                                <tr className="border-b border-vox-outline/10"><td className="py-2.5 pr-3"><code className="text-xs text-blue-400">POST</code></td><td className="py-2.5 pr-3 font-mono text-xs">/api/v1/tts/stream-token</td><td className="py-2.5">{t.apiDocs.overview.endpoint.streamToken}</td></tr>
                                <tr className="border-b border-vox-outline/10"><td className="py-2.5 pr-3"><code className="text-xs text-purple-400">WS</code></td><td className="py-2.5 pr-3 font-mono text-xs">/ws/tts/stream?token=...</td><td className="py-2.5">{t.apiDocs.overview.endpoint.websocket}</td></tr>
                                <tr><td className="py-2.5 pr-3"><code className="text-xs text-green-400">GET</code></td><td className="py-2.5 pr-3 font-mono text-xs">/api/v1/usage</td><td className="py-2.5">{t.apiDocs.overview.endpoint.usage}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <InfoBox>
                        <p className="font-semibold text-vox-heading mb-1">🔗 {t.apiDocs.overview.dynamicBaseUrl.title}</p>
                        <p className="text-vox-text-dim">{t.apiDocs.overview.dynamicBaseUrl.description}<code className="font-mono text-xs">{API_BASE_URL}</code>{t.apiDocs.overview.dynamicBaseUrl.descriptionSuffix}</p>
                    </InfoBox>
                </SectionCard>

                {/* ── Authentication ── */}
                <SectionCard id="auth" icon={<Key size={20} />} title={t.apiDocs.authentication.title}>
                    <p className="text-vox-text leading-relaxed">{t.apiDocs.authentication.description}</p>
                    <CopyBlock language="http" code={`Authorization: Bearer vc_sk_live_xxxxx\nContent-Type: application/json`} />
                    <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10 space-y-2 text-sm">
                        <p className="font-semibold text-vox-heading">{t.apiDocs.authentication.keyAnatomy.title}</p>
                        <p className="text-vox-text font-mono text-xs">vc_sk_live_&lt;random_base64url&gt;</p>
                        <p className="text-vox-text-dim"><code className="font-mono text-xs">vc</code> = Voice Clone · <code className="font-mono text-xs">sk</code> = Secret Key · <code className="font-mono text-xs">live</code> = Production</p>
                    </div>
                    <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10 space-y-2 text-sm">
                        <p className="font-semibold text-vox-heading">{t.apiDocs.authentication.scopes.title}</p>
                        <p className="text-vox-text-dim">{t.apiDocs.authentication.scopes.description}</p>
                    </div>
                    <WarningBox title={t.apiDocs.authentication.security.title}>
                        <p>{t.apiDocs.authentication.security.description}</p>
                    </WarningBox>
                </SectionCard>

                {/* ── Generate Speech ── */}
                <SectionCard id="generate" icon={<Zap size={20} />} title={t.apiDocs.generateSpeech.title}>
                    <EndpointHeader method="POST" path="/api/v1/tts/generate" desc={t.apiDocs.generateSpeech.description} />
                    <h3 className="text-sm font-bold text-vox-heading mt-4">{t.apiDocs.generateSpeech.requestBody}</h3>
                    <ParamTable>
                        <ParamRow name="text" type="string" required desc={t.apiDocs.generateSpeech.fields.text} />
                        <ParamRow name="language" type="string" desc={t.apiDocs.generateSpeech.fields.language} />
                        <ParamRow name="format" type="string" desc={t.apiDocs.generateSpeech.fields.format} />
                        <ParamRow name="speed" type="number" desc={t.apiDocs.generateSpeech.fields.speed} />
                        <ParamRow name="control_instruction" type="string" desc={t.apiDocs.generateSpeech.fields.controlInstruction} />
                        <ParamRow name="cfg_value" type="number" desc={t.apiDocs.generateSpeech.fields.cfgValue} />
                        <ParamRow name="dit_steps" type="number" desc={t.apiDocs.generateSpeech.fields.ditSteps} />
                    </ParamTable>
                    <h3 className="text-sm font-bold text-vox-heading">{t.apiDocs.exampleRequest}</h3>
                    <CopyBlock code={EX.CURL_GENERATE} />
                    <h3 className="text-sm font-bold text-vox-heading">{t.apiDocs.successResponse}</h3>
                    <CopyBlock language="json" code={EX.RESPONSE_GENERATE} />
                    <h3 className="text-sm font-bold text-vox-heading">{t.apiDocs.errorResponse}</h3>
                    <CopyBlock language="json" code={EX.RESPONSE_ERROR} />
                </SectionCard>

                {/* ── Stream Token ── */}
                <SectionCard id="stream-token" icon={<Key size={20} />} title={t.apiDocs.streamToken.title}>
                    <EndpointHeader method="POST" path="/api/v1/tts/stream-token" desc={t.apiDocs.streamToken.description} />
                    <ParamTable>
                        <ParamRow name="text_length" type="number" required desc={t.apiDocs.streamToken.fields.textLength} />
                    </ParamTable>
                    <h3 className="text-sm font-bold text-vox-heading">{t.apiDocs.exampleRequest}</h3>
                    <CopyBlock code={EX.CURL_STREAM_TOKEN} />
                    <h3 className="text-sm font-bold text-vox-heading">{t.apiDocs.successResponse}</h3>
                    <CopyBlock language="json" code={EX.RESPONSE_STREAM_TOKEN} />
                    <InfoBox>
                        <p className="font-semibold text-vox-heading mb-1">⏱️ {t.apiDocs.streamToken.tokenExpiry.title}</p>
                        <p className="text-vox-text-dim">{t.apiDocs.streamToken.tokenExpiry.description}</p>
                    </InfoBox>
                </SectionCard>

                {/* ── WebSocket Streaming ── */}
                <SectionCard id="ws-streaming" icon={<Wifi size={20} />} title={t.apiDocs.websocket.title}>
                    <EndpointHeader method="WS" path="/ws/tts/stream?token=<stream_token>" desc={t.apiDocs.websocket.description} />
                    <h3 className="text-sm font-bold text-vox-heading mt-4">{t.apiDocs.websocket.connectionFlow}</h3>
                    <StepList steps={[
                        { title: t.apiDocs.websocket.step1.title, desc: t.apiDocs.websocket.step1.description },
                        { title: t.apiDocs.websocket.step2.title, desc: t.apiDocs.websocket.step2.description },
                        { title: t.apiDocs.websocket.step3.title, desc: t.apiDocs.websocket.step3.description },
                        { title: t.apiDocs.websocket.step4.title, desc: t.apiDocs.websocket.step4.description },
                        { title: t.apiDocs.websocket.step5.title, desc: t.apiDocs.websocket.step5.description },
                    ]} />
                    <h3 className="text-sm font-bold text-vox-heading">{t.apiDocs.websocket.startMessageFormat}</h3>
                    <CopyBlock language="json" code={EX.WS_START_MSG} />
                    <h3 className="text-sm font-bold text-vox-heading">{t.apiDocs.websocket.serverEvents}</h3>
                    <CopyBlock language="javascript" code={EX.WS_EVENTS} />
                    <InfoBox>
                        <p className="font-semibold text-vox-heading mb-1">🔊 {t.apiDocs.websocket.realTimePlayback.title}</p>
                        <p className="text-vox-text-dim">{t.apiDocs.websocket.realTimePlayback.description}</p>
                    </InfoBox>
                </SectionCard>

                {/* ── Usage & Quota ── */}
                <SectionCard id="usage" icon={<BarChart3 size={20} />} title={t.apiDocs.usage.title}>
                    <EndpointHeader method="GET" path="/api/v1/usage" desc={t.apiDocs.usage.description} />
                    <h3 className="text-sm font-bold text-vox-heading mt-4">{t.apiDocs.exampleRequest}</h3>
                    <CopyBlock code={EX.CURL_USAGE} />
                    <h3 className="text-sm font-bold text-vox-heading">{t.apiDocs.successResponse}</h3>
                    <CopyBlock language="json" code={EX.RESPONSE_USAGE} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">{t.apiDocs.usage.charging.title}</p>
                            <p className="font-semibold text-vox-heading text-sm">{t.apiDocs.usage.charging.subtitle}</p>
                            <p className="text-xs text-vox-text-dim mt-1">{t.apiDocs.usage.charging.description}</p>
                        </div>
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">{t.apiDocs.usage.rateLimit.title}</p>
                            <p className="font-semibold text-vox-heading text-sm">{t.apiDocs.usage.rateLimit.subtitle}</p>
                            <p className="text-xs text-vox-text-dim mt-1">{t.apiDocs.usage.rateLimit.description}</p>
                        </div>
                        <div className="bg-vox-surface-low rounded-xl p-4 border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim mb-1">{t.apiDocs.usage.reset.title}</p>
                            <p className="font-semibold text-vox-heading text-sm">{t.apiDocs.usage.reset.subtitle}</p>
                            <p className="text-xs text-vox-text-dim mt-1">{t.apiDocs.usage.reset.description}</p>
                        </div>
                    </div>
                </SectionCard>

                {/* ── Error Codes ── */}
                <SectionCard id="errors" icon={<Server size={20} />} title={t.apiDocs.errors.title}>
                    <p className="text-sm text-vox-text mb-2">{t.apiDocs.errors.envelope}</p>
                    <CopyBlock language="json" code={EX.RESPONSE_ERROR} />
                    <h3 className="text-sm font-bold text-vox-heading mt-2">{t.apiDocs.errors.title}</h3>
                    <ErrorTable />
                </SectionCard>

                {/* ── Code Examples ── */}
                <SectionCard id="examples" icon={<Code2 size={20} />} title={t.apiDocs.codeExamples.title}>
                    <InfoBox>
                        <p className="text-vox-text-dim">{t.apiDocs.codeExamples.descriptionPrefix}<code className="font-mono text-xs">{API_BASE_URL}</code>{t.apiDocs.codeExamples.descriptionSuffix}</p>
                    </InfoBox>

                    <CollapsibleExample title={t.apiDocs.codeExamples.curlGenerateSpeech} defaultOpen>
                        <CopyBlock code={EX.CURL_GENERATE} />
                    </CollapsibleExample>
                    <CollapsibleExample title={t.apiDocs.codeExamples.curlCheckQuota}>
                        <CopyBlock code={EX.CURL_USAGE} />
                    </CollapsibleExample>
                    <CollapsibleExample title={t.apiDocs.codeExamples.curlStreamToken}>
                        <CopyBlock code={EX.CURL_STREAM_TOKEN} />
                    </CollapsibleExample>
                    <CollapsibleExample title={t.apiDocs.codeExamples.pythonGenerateSpeech}>
                        <CopyBlock language="python" code={EX.PYTHON_GENERATE} />
                    </CollapsibleExample>
                    <CollapsibleExample title={t.apiDocs.codeExamples.pythonWebsocket}>
                        <CopyBlock language="python" code={EX.PYTHON_WEBSOCKET} />
                    </CollapsibleExample>
                    <CollapsibleExample title={t.apiDocs.codeExamples.jsGenerateSpeech}>
                        <CopyBlock language="javascript" code={EX.JS_GENERATE} />
                    </CollapsibleExample>
                    <CollapsibleExample title={t.apiDocs.codeExamples.jsWebsocket}>
                        <CopyBlock language="javascript" code={EX.JS_WEBSOCKET} />
                    </CollapsibleExample>
                </SectionCard>

                {/* ── Troubleshooting ── */}
                <SectionCard id="troubleshooting" icon={<Server size={20} />} title={t.apiDocs.troubleshooting.title}>
                    <div className="space-y-4">
                        {[
                            { q: t.apiDocs.troubleshooting.invalidBearer.title, a: t.apiDocs.troubleshooting.invalidBearer.description },
                            { q: t.apiDocs.troubleshooting.missingScope.title, a: t.apiDocs.troubleshooting.missingScope.description },
                            { q: t.apiDocs.troubleshooting.quotaExceeded.title, a: t.apiDocs.troubleshooting.quotaExceeded.description },
                            { q: t.apiDocs.troubleshooting.noDirectory.title, a: t.apiDocs.troubleshooting.noDirectory.description },
                            { q: t.apiDocs.troubleshooting.backendFetch.title, a: t.apiDocs.troubleshooting.backendFetch.description },
                            { q: t.apiDocs.troubleshooting.websocketClose.title, a: t.apiDocs.troubleshooting.websocketClose.description },
                            { q: t.apiDocs.troubleshooting.noAudio.title, a: t.apiDocs.troubleshooting.noAudio.description },
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
                    <h3 className="text-lg font-bold text-vox-heading mb-2">{t.apiDocs.readyToBuild}</h3>
                    <p className="text-sm text-vox-text-dim mb-4">{t.apiDocs.readyToBuildDesc}</p>
                    <div className="flex items-center justify-center gap-3">
                        <Link href="/studio/playground" className="inline-flex items-center gap-2 px-5 py-2.5 bg-vox-primary text-white rounded-xl text-sm font-semibold hover:bg-vox-primary/90 transition-colors">
                            <TerminalSquare size={16} /> {t.apiDocs.testInPlayground}
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
