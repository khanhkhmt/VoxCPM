import svgCaptcha from "svg-captcha";
import path from "path";
import fs from "fs";

// Override font loading to fix Next.js Webpack __dirname path resolution errors
try {
    const fontPath = path.join(process.cwd(), "node_modules", "svg-captcha", "fonts", "Comismsh.ttf");
    if (fs.existsSync(fontPath)) {
        svgCaptcha.loadFont(fontPath);
    }
} catch (error) {
    console.error("Failed to load svg-captcha font:", error);
}

// ---------------------------------------------------------------------------
// CaptchaStore interface
// ---------------------------------------------------------------------------
export interface CaptchaStore {
    set(uuid: string, text: string, svg: string, ttlSeconds: number): Promise<void>;
    /** Non-destructive read. Returns null if not found or expired. */
    get(uuid: string): Promise<{ text: string; svg: string } | null>;
    /** Delete entry. */
    delete(uuid: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// In-memory implementation (dev-only)
// ---------------------------------------------------------------------------
class InMemoryCaptchaStore implements CaptchaStore {
    private store = new Map<string, { text: string; svg: string; expiresAt: number }>();

    async set(uuid: string, text: string, svg: string, ttlSeconds: number): Promise<void> {
        this.store.set(uuid, {
            text,
            svg,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    async get(uuid: string): Promise<{ text: string; svg: string } | null> {
        const entry = this.store.get(uuid);
        if (!entry) return null;
        if (entry.expiresAt < Date.now()) {
            this.store.delete(uuid);
            return null;
        }
        return { text: entry.text, svg: entry.svg };
    }

    async delete(uuid: string): Promise<void> {
        this.store.delete(uuid);
    }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
const globalForCaptcha = globalThis as unknown as {
    __captchaStore_v2__: CaptchaStore | undefined;
};

export function getCaptchaStore(): CaptchaStore {
    if (!globalForCaptcha.__captchaStore_v2__) {
        // Always use in-memory for simplicity (no Redis needed)
        globalForCaptcha.__captchaStore_v2__ = new InMemoryCaptchaStore();
    }
    return globalForCaptcha.__captchaStore_v2__;
}

// ---------------------------------------------------------------------------
// Generate + store captcha (idempotent per UUID)
// ---------------------------------------------------------------------------
const CAPTCHA_TTL_SECONDS = 5 * 60; // 5 minutes

/**
 * Get or create a captcha for the given UUID.
 * If a captcha already exists for this UUID, return it (idempotent).
 * This prevents React strict-mode double-fetches from invalidating the captcha.
 */
export async function getOrCreateCaptcha(uuid: string): Promise<{ text: string; svg: string }> {
    const store = getCaptchaStore();

    // Check if we already have one for this UUID
    const existing = await store.get(uuid);
    if (existing) {
        return existing;
    }

    // Generate new
    const captcha = svgCaptcha.create({
        size: 5,
        noise: 2,
        color: true,
        background: "#111827",
        charPreset: "0123456789AHUWQMN",
    });

    const text = captcha.text.toLowerCase();
    const svg = captcha.data;

    await store.set(uuid, text, svg, CAPTCHA_TTL_SECONDS);
    return { text, svg };
}

// ---------------------------------------------------------------------------
// Verify captcha (non-destructive read, delete only on success)
// ---------------------------------------------------------------------------
export async function verifyCaptcha(
    uuid: string,
    userInput: string,
): Promise<{ ok: boolean; code?: string }> {
    const store = getCaptchaStore();
    const entry = await store.get(uuid);

    if (entry === null) {
        return { ok: false, code: "CAPTCHA_EXPIRED" };
    }

    if (userInput.toLowerCase() !== entry.text) {
        return { ok: false, code: "CAPTCHA_WRONG" };
    }

    // Delete only after successful verification
    await store.delete(uuid);
    return { ok: true };
}
