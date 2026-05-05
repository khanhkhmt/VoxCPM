
import { prisma } from "../src/lib/db";
import { SignJWT } from "jose";
import crypto from "crypto";
import WebSocket from "ws";

const JWT_SECRET_RAW = process.env.AUTH_JWT_SECRET || "dev-secret-CHANGE-ME-in-production-please";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const SESSION_MAX_AGE = 12 * 60 * 60;

async function sha256(input: string): Promise<string> {
    const hash = crypto.createHash("sha256").update(input).digest("hex");
    return hash;
}

async function verify() {
    console.log("--- Starting Phase 2A Verification ---");

    // 1. Create Test User
    const user = await prisma.user.upsert({
        where: { username: "tester_p2a" },
        update: {},
        create: {
            username: "tester_p2a",
            name: "Phase 2A Tester",
            passwordHash: "dummy",
            quotaCharsMonth: 1000,
            usageCharsMonth: 0
        }
    });
    console.log("Test User created/found:", user.id);

    // 2. Create Session
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            tokenHash: "pending",
            expiresAt
        }
    });

    const sessionToken = await new SignJWT({ userId: user.id, sessionId: session.id })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_MAX_AGE}s`)
        .sign(JWT_SECRET);

    const tokenHash = await sha256(sessionToken);
    await prisma.session.update({
        where: { id: session.id },
        data: { tokenHash }
    });
    console.log("Session created.");

    const headers = {
        "Cookie": `voxora_session=${sessionToken}`,
        "Content-Type": "application/json"
    };

    // 3. Create API Key
    console.log("Creating API Key...");
    const keyRes = await fetch("http://localhost:3000/api/keys", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Verify Key", environment: "test" })
    });
    const keyData = await keyRes.json();
    if (!keyData.ok) throw new Error("Failed to create API key: " + JSON.stringify(keyData));
    const plainKey = keyData.data.plainKey;
    console.log("API Key created:", keyData.data.key.prefix + "... (lastFour: " + keyData.data.key.lastFour + ")");

    const apiHeaders = {
        "Authorization": `Bearer ${plainKey}`,
        "Content-Type": "application/json"
    };

    // 4. Check Initial Usage
    console.log("Checking Initial Usage...");
    const usageRes1 = await fetch("http://localhost:3000/api/v1/usage", { headers: apiHeaders });
    const usageData1 = await usageRes1.json();
    console.log("Usage before:", usageData1.data.used, "/", usageData1.data.limit);

    // 5. Get Stream Token (Deduct 10 chars)
    console.log("Requesting Stream Token (text_length: 10)...");
    const streamTokenRes = await fetch("http://localhost:3000/api/v1/tts/stream-token", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ text_length: 10 })
    });
    const streamTokenData = await streamTokenRes.json();
    if (!streamTokenData.ok) throw new Error("Failed to get stream token: " + JSON.stringify(streamTokenData));
    console.log("Stream token issued. Max length:", streamTokenData.data.max_length);

    // 6. Verify Usage Deduction
    const usageRes2 = await fetch("http://localhost:3000/api/v1/usage", { headers: apiHeaders });
    const usageData2 = await usageRes2.json();
    console.log("Usage after:", usageData2.data.used, "/", usageData2.data.limit);
    if (usageData2.data.used !== usageData1.data.used + 10) {
        throw new Error("Quota deduction failed! Expected " + (usageData1.data.used + 10) + " but got " + usageData2.data.used);
    }
    console.log("✅ Quota deduction verified.");

    // 7. Test Batch Generate
    console.log("Testing Batch Generate (text: 'Hello world')...");
    const genRes = await fetch("http://localhost:3000/api/v1/tts/generate", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ text: "Hello world" })
    });
    const genData = await genRes.json();
    if (!genData.ok) throw new Error("Batch Generate failed: " + JSON.stringify(genData));
    console.log("✅ Batch Generate successful. Audio URL:", genData.data.audio_url);

    // 8. Verify Usage after Batch (11 chars)
    const usageRes3 = await fetch("http://localhost:3000/api/v1/usage", { headers: apiHeaders });
    const usageData3 = await usageRes3.json();
    console.log("Usage after batch:", usageData3.data.used, "/", usageData3.data.limit);
    if (usageData3.data.used !== usageData2.data.used + 11) {
        throw new Error("Quota deduction for batch failed!");
    }
    console.log("✅ Batch Quota deduction verified.");

    // 9. Verify WebSocket Rejection
    console.log("Testing WebSocket rejection (sending 20 chars for 10 char token)...");
    const wsUrl = streamTokenData.data.ws_url + "?token=" + streamTokenData.data.stream_token;
    console.log("Connecting to:", wsUrl);
    
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        let errorReceived = false;

        ws.on("open", () => {
            console.log("WS Opened. Sending start message...");
            ws.send(JSON.stringify({
                type: "start",
                text: "This text is definitely longer than ten chars", // ~46 chars
                streaming_mode: "stable"
            }));
        });

        ws.on("message", (msg) => {
            console.log("WS Message received:", msg.toString());
            const data = JSON.parse(msg.toString());
            if (data.type === "error") {
                console.log("✅ Received expected error:", data.message);
                errorReceived = true;
            }
        });

        ws.on("error", (err) => {
            console.error("WS Error:", err);
        });

        ws.on("close", (code, reason) => {
            console.log("WebSocket closed with code:", code, "reason:", reason.toString());
            if (errorReceived) {
                console.log("✅ WebSocket rejection verified.");
                resolve(true);
            } else {
                reject(new Error("WebSocket closed without receiving expected error message. Code: " + code));
            }
        });

        setTimeout(() => {
            ws.terminate();
            reject(new Error("WebSocket test timed out."));
        }, 10000);
    });
}

verify().then(() => {
    console.log("--- Phase 2A Verification COMPLETED SUCCESSFULLY ---");
    process.exit(0);
}).catch(err => {
    console.error("--- Phase 2A Verification FAILED ---");
    console.error(err);
    process.exit(1);
});
