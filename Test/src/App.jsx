import { useState, useRef, useCallback } from "react";
import { fetchUsage, generateTTS, getStreamToken, createStreamWebSocket } from "./api";

/* ------------------------------------------------------------------ */
/*  Tiny reusable components                                          */
/* ------------------------------------------------------------------ */

function StatusBadge({ code }) {
  if (!code) return null;
  const color =
    code >= 200 && code < 300
      ? "var(--clr-success)"
      : code >= 400
      ? "var(--clr-danger)"
      : "var(--clr-warning)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 700,
        background: color,
        color: "#fff",
      }}
    >
      {code}
    </span>
  );
}

function JsonBlock({ data }) {
  if (!data) return null;
  return (
    <pre className="json-block">
      {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
    </pre>
  );
}

function LogPanel({ logs }) {
  const endRef = useRef(null);
  return (
    <div className="log-panel">
      {logs.map((l, i) => (
        <div key={i} className={`log-line log-${l.type}`}>
          <span className="log-ts">{l.ts}</span>
          <span>{l.msg}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main App                                                          */
/* ------------------------------------------------------------------ */

export default function App() {
  /* ---- Global config ---- */
  const [baseUrl, setBaseUrl] = useState(
    import.meta.env.VITE_BASE_API_URL || "http://127.0.0.1:8000"
  );
  const [apiKey, setApiKey] = useState("");
  const [activeTab, setActiveTab] = useState("usage");

  /* ---- Usage ---- */
  const [usageStatus, setUsageStatus] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);

  /* ---- Generate ---- */
  const [genForm, setGenForm] = useState({
    text: "Xin chào, đây là bài test giọng nói VoxCPM.",
    language: "auto",
    speed: "1.0",
    format: "mp3",
    control_instruction: "",
    cfg_value: "2.0",
    dit_steps: "6",
  });
  const [genStatus, setGenStatus] = useState(null);
  const [genData, setGenData] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  /* ---- Stream token ---- */
  const [stTextLen, setStTextLen] = useState("200");
  const [stStatus, setStStatus] = useState(null);
  const [stData, setStData] = useState(null);
  const [stLoading, setStLoading] = useState(false);

  /* ---- WebSocket ---- */
  const [wsUrl, setWsUrl] = useState("ws://127.0.0.1:8808/ws/tts/stream");
  const [wsToken, setWsToken] = useState("");
  const [wsText, setWsText] = useState("Hello from the WebSocket streaming test!");
  const [wsParams, setWsParams] = useState({
    control_instruction: "",
    cfg_value: "2.0",
    dit_steps: "6",
    language: "auto",
  });
  const [wsLogs, setWsLogs] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const [wsAudioUrl, setWsAudioUrl] = useState(null);
  const chunksRef = useRef([]);

  const ts = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

  const addLog = useCallback((type, msg) => {
    setWsLogs((prev) => [...prev, { type, msg, ts: ts() }]);
  }, []);

  /* ---- Handlers ---- */

  const handleUsage = async () => {
    setUsageLoading(true);
    setUsageStatus(null);
    setUsageData(null);
    try {
      const { status, data } = await fetchUsage(baseUrl, apiKey);
      setUsageStatus(status);
      setUsageData(data);
    } catch (e) {
      setUsageStatus("ERR");
      setUsageData({ error: e.message });
    }
    setUsageLoading(false);
  };

  const handleGenerate = async () => {
    setGenLoading(true);
    setGenStatus(null);
    setGenData(null);
    setAudioUrl(null);
    try {
      const { status, data } = await generateTTS(baseUrl, apiKey, genForm);
      setGenStatus(status);
      setGenData(data);
      if (data?.audio_url) {
        const full = data.audio_url.startsWith("http")
          ? data.audio_url
          : `${baseUrl}${data.audio_url}`;
        setAudioUrl(full);
      }
    } catch (e) {
      setGenStatus("ERR");
      setGenData({ error: e.message });
    }
    setGenLoading(false);
  };

  const handleStreamToken = async () => {
    setStLoading(true);
    setStStatus(null);
    setStData(null);
    try {
      const { status, data } = await getStreamToken(baseUrl, apiKey, stTextLen);
      setStStatus(status);
      setStData(data);
      if (data?.stream_token) setWsToken(data.stream_token);
    } catch (e) {
      setStStatus("ERR");
      setStData({ error: e.message });
    }
    setStLoading(false);
  };

  const handleWsConnect = () => {
    if (!wsToken) {
      addLog("error", "No stream token. Get one first.");
      return;
    }
    if (!wsUrl) {
      addLog("error", "No WebSocket URL provided.");
      return;
    }
    setWsLogs([]);
    setWsAudioUrl(null);
    chunksRef.current = [];
    addLog("info", `Connecting to ${wsUrl}…`);

    const ws = createStreamWebSocket(wsUrl, wsToken);
    wsRef.current = ws;

    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setWsConnected(true);
      addLog("success", "✅ WebSocket connected");

      const startMsg = {
        type: "start",
        text: wsText,
        control_instruction: wsParams.control_instruction,
        cfg_value: parseFloat(wsParams.cfg_value) || 2.0,
        dit_steps: parseInt(wsParams.dit_steps, 10) || 6,
        language: wsParams.language || "auto",
        streaming_mode: "stable",
      };
      ws.send(JSON.stringify(startMsg));
      addLog("info", `➡️ Sent start message: ${JSON.stringify(startMsg)}`);
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const bytes = event.data.byteLength;
        chunksRef.current.push(new Uint8Array(event.data));
        addLog("info", `🔊 Binary chunk received: ${bytes} bytes`);
        return;
      }

      try {
        const msg = JSON.parse(event.data);
        addLog("info", `📩 ${msg.type || "message"}: ${JSON.stringify(msg)}`);

        if (msg.type === "done" && msg.audio_url) {
          const full = msg.audio_url.startsWith("http")
            ? msg.audio_url
            : `${baseUrl}${msg.audio_url}`;
          setWsAudioUrl(full);
          addLog("success", `🎵 Audio URL: ${full}`);
        }

        if (msg.type === "error") {
          addLog("error", `❌ Error: ${msg.message || JSON.stringify(msg)}`);
        }
      } catch {
        addLog("info", `📩 Raw text: ${event.data}`);
      }
    };

    ws.onerror = (err) => {
      addLog("error", `❌ WebSocket error: ${err.message || "unknown"}`);
    };

    ws.onclose = (ev) => {
      setWsConnected(false);
      addLog("info", `🔌 WebSocket closed (code=${ev.code}, reason=${ev.reason || "none"})`);

      // If we have binary chunks, build a blob URL
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setWsAudioUrl(url);
        addLog("success", `🎵 Built audio from ${chunksRef.current.length} binary chunks`);
      }
    };
  };

  const handleWsDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  /* ---- Tab buttons ---- */
  const tabs = [
    { id: "usage", label: "📊 Usage / Quota" },
    { id: "generate", label: "🔊 TTS Generate" },
    { id: "stream", label: "🎫 Stream Token" },
    { id: "ws", label: "⚡ WebSocket" },
  ];

  return (
    <div className="app-root">
      {/* ===== SIDEBAR ===== */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">V</div>
          <span className="logo-text">VoxCPM Tester</span>
        </div>

        <div className="sidebar-section">
          <label className="field-label">Base API URL</label>
          <input
            className="field-input"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://127.0.0.1:8000"
          />
        </div>

        <div className="sidebar-section">
          <label className="field-label">Voice API Key</label>
          <input
            className="field-input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="vc_sk_live_xxx"
          />
        </div>

        <nav className="sidebar-nav">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`nav-btn ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <small>VoxCPM API Tester v1.0</small>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="main-content">
        {/* ---------- USAGE ---------- */}
        {activeTab === "usage" && (
          <section className="panel fade-in">
            <h2 className="panel-title">📊 Usage / Quota</h2>
            <p className="panel-desc">
              Calls <code>GET /api/v1/usage</code> to check your current quota and character usage.
            </p>
            <button className="btn btn-primary" onClick={handleUsage} disabled={usageLoading}>
              {usageLoading ? "Loading…" : "Test Usage / Quota"}
            </button>

            {usageStatus && (
              <div className="result-box">
                <div className="result-header">
                  <StatusBadge code={usageStatus} />
                  <span className="result-endpoint">GET /api/v1/usage</span>
                </div>
                <JsonBlock data={usageData} />
              </div>
            )}
          </section>
        )}

        {/* ---------- GENERATE ---------- */}
        {activeTab === "generate" && (
          <section className="panel fade-in">
            <h2 className="panel-title">🔊 TTS Generate (Blocking)</h2>
            <p className="panel-desc">
              Calls <code>POST /api/v1/tts/generate</code> — returns audio_url when done.
            </p>

            <div className="form-grid">
              <div className="form-group span-2">
                <label className="field-label">Text</label>
                <textarea
                  className="field-input field-textarea"
                  rows={3}
                  value={genForm.text}
                  onChange={(e) => setGenForm((p) => ({ ...p, text: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Language</label>
                <select
                  className="field-input"
                  value={genForm.language}
                  onChange={(e) => setGenForm((p) => ({ ...p, language: e.target.value }))}
                >
                  <option value="auto">auto</option>
                  <option value="vi">vi</option>
                  <option value="en">en</option>
                  <option value="zh">zh</option>
                  <option value="ja">ja</option>
                  <option value="ko">ko</option>
                  <option value="fr">fr</option>
                  <option value="de">de</option>
                  <option value="es">es</option>
                </select>
              </div>

              <div className="form-group">
                <label className="field-label">Speed</label>
                <input
                  className="field-input"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="2.0"
                  value={genForm.speed}
                  onChange={(e) => setGenForm((p) => ({ ...p, speed: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Format</label>
                <select
                  className="field-input"
                  value={genForm.format}
                  onChange={(e) => setGenForm((p) => ({ ...p, format: e.target.value }))}
                >
                  <option value="mp3">mp3</option>
                  <option value="wav">wav</option>
                </select>
              </div>

              <div className="form-group">
                <label className="field-label">CFG Value</label>
                <input
                  className="field-input"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={genForm.cfg_value}
                  onChange={(e) => setGenForm((p) => ({ ...p, cfg_value: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="field-label">DiT Steps</label>
                <input
                  className="field-input"
                  type="number"
                  step="1"
                  min="1"
                  max="50"
                  value={genForm.dit_steps}
                  onChange={(e) => setGenForm((p) => ({ ...p, dit_steps: e.target.value }))}
                />
              </div>

              <div className="form-group span-2">
                <label className="field-label">Control Instruction</label>
                <input
                  className="field-input"
                  value={genForm.control_instruction}
                  onChange={(e) =>
                    setGenForm((p) => ({ ...p, control_instruction: e.target.value }))
                  }
                  placeholder="e.g. Young female, warm and gentle"
                />
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleGenerate} disabled={genLoading}>
              {genLoading ? "Generating…" : "Generate Speech"}
            </button>

            {genStatus && (
              <div className="result-box">
                <div className="result-header">
                  <StatusBadge code={genStatus} />
                  <span className="result-endpoint">POST /api/v1/tts/generate</span>
                </div>
                <JsonBlock data={genData} />
                {audioUrl && (
                  <div className="audio-player-box">
                    <label className="field-label">🎧 Audio Preview</label>
                    <audio controls src={audioUrl} className="audio-player" />
                    <a href={audioUrl} target="_blank" rel="noreferrer" className="audio-link">
                      Open audio URL ↗
                    </a>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ---------- STREAM TOKEN ---------- */}
        {activeTab === "stream" && (
          <section className="panel fade-in">
            <h2 className="panel-title">🎫 Stream Token</h2>
            <p className="panel-desc">
              Calls <code>POST /api/v1/tts/stream-token</code> — returns a one-time token for
              WebSocket streaming.
            </p>

            <div className="form-grid">
              <div className="form-group">
                <label className="field-label">Text Length (chars to reserve)</label>
                <input
                  className="field-input"
                  type="number"
                  value={stTextLen}
                  onChange={(e) => setStTextLen(e.target.value)}
                  min={1}
                />
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleStreamToken} disabled={stLoading}>
              {stLoading ? "Requesting…" : "Get Stream Token"}
            </button>

            {stStatus && (
              <div className="result-box">
                <div className="result-header">
                  <StatusBadge code={stStatus} />
                  <span className="result-endpoint">POST /api/v1/tts/stream-token</span>
                </div>
                <JsonBlock data={stData} />

                {stData?.stream_token && (
                  <div className="token-details">
                    <div className="token-row">
                      <span className="token-label">stream_token</span>
                      <code className="token-value">{stData.stream_token}</code>
                    </div>
                    {stData.ws_url && (
                      <div className="token-row">
                        <span className="token-label">ws_url</span>
                        <code className="token-value">{stData.ws_url}</code>
                      </div>
                    )}
                    {stData.max_length != null && (
                      <div className="token-row">
                        <span className="token-label">max_length</span>
                        <code className="token-value">{stData.max_length}</code>
                      </div>
                    )}
                    {stData.chars_deducted != null && (
                      <div className="token-row">
                        <span className="token-label">chars_deducted</span>
                        <code className="token-value">{stData.chars_deducted}</code>
                      </div>
                    )}
                    {stData.expires_in != null && (
                      <div className="token-row">
                        <span className="token-label">expires_in</span>
                        <code className="token-value">{stData.expires_in}s</code>
                      </div>
                    )}
                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: 12 }}
                      onClick={() => {
                        setWsToken(stData.stream_token);
                        if (stData.ws_url) setWsUrl(stData.ws_url);
                        setActiveTab("ws");
                      }}
                    >
                      Use this token in WebSocket tab →
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ---------- WEBSOCKET ---------- */}
        {activeTab === "ws" && (
          <section className="panel fade-in">
            <h2 className="panel-title">⚡ WebSocket Streaming</h2>
            <p className="panel-desc">
              Connects to <code>ws(s)://…/ws/tts/stream?token=…</code> and sends a{" "}
              <code>start</code> message with TTS parameters.
            </p>

            <div className="form-grid">
              <div className="form-group span-2">
                <label className="field-label">WebSocket URL</label>
                <input
                  className="field-input"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  placeholder="ws://127.0.0.1:8808/ws/tts/stream"
                />
              </div>

              <div className="form-group span-2">
                <label className="field-label">Stream Token</label>
                <input
                  className="field-input"
                  value={wsToken}
                  onChange={(e) => setWsToken(e.target.value)}
                  placeholder="Paste stream_token here or get one from Stream Token tab"
                />
              </div>

              <div className="form-group span-2">
                <label className="field-label">Text to synthesize</label>
                <textarea
                  className="field-input field-textarea"
                  rows={3}
                  value={wsText}
                  onChange={(e) => setWsText(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Language</label>
                <select
                  className="field-input"
                  value={wsParams.language}
                  onChange={(e) => setWsParams((p) => ({ ...p, language: e.target.value }))}
                >
                  <option value="auto">auto</option>
                  <option value="vi">vi</option>
                  <option value="en">en</option>
                  <option value="zh">zh</option>
                  <option value="ja">ja</option>
                  <option value="ko">ko</option>
                </select>
              </div>

              <div className="form-group">
                <label className="field-label">CFG Value</label>
                <input
                  className="field-input"
                  type="number"
                  step="0.1"
                  value={wsParams.cfg_value}
                  onChange={(e) => setWsParams((p) => ({ ...p, cfg_value: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="field-label">DiT Steps</label>
                <input
                  className="field-input"
                  type="number"
                  step="1"
                  min="1"
                  max="50"
                  value={wsParams.dit_steps}
                  onChange={(e) => setWsParams((p) => ({ ...p, dit_steps: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Control Instruction</label>
                <input
                  className="field-input"
                  value={wsParams.control_instruction}
                  onChange={(e) =>
                    setWsParams((p) => ({ ...p, control_instruction: e.target.value }))
                  }
                  placeholder="Optional voice style"
                />
              </div>
            </div>

            <div className="btn-row">
              {!wsConnected ? (
                <button className="btn btn-primary" onClick={handleWsConnect}>
                  🔌 Connect & Send
                </button>
              ) : (
                <button className="btn btn-danger" onClick={handleWsDisconnect}>
                  ❌ Disconnect
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setWsLogs([]);
                  setWsAudioUrl(null);
                }}
              >
                Clear Logs
              </button>
            </div>

            <div className="ws-status">
              Status:{" "}
              <span className={wsConnected ? "ws-connected" : "ws-disconnected"}>
                {wsConnected ? "● Connected" : "○ Disconnected"}
              </span>
            </div>

            <LogPanel logs={wsLogs} />

            {wsAudioUrl && (
              <div className="audio-player-box">
                <label className="field-label">🎧 Streamed Audio</label>
                <audio controls src={wsAudioUrl} className="audio-player" />
                <a href={wsAudioUrl} target="_blank" rel="noreferrer" className="audio-link">
                  Open audio URL ↗
                </a>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
