import svgCaptcha from "svg-captcha";

// ---------------------------------------------------------------------------
// CaptchaStore interface
// ---------------------------------------------------------------------------
export interface CaptchaStore {
    set(uuid: string, text: string, ttlSeconds: number): Promise<void>;
    /** Atomic get + delete. Returns null if not found or expired. */
    takeAndDelete(uuid: string): Promise<string | null>;
}

// ---------------------------------------------------------------------------
// In-memory implementation (dev-only)
// ---------------------------------------------------------------------------
class InMemoryCaptchaStore implements CaptchaStore {
    private store = new Map<string, { text: string; expiresAt: number }>();

    async set(uuid: string, text: string, ttlSeconds: number): Promise<void> {
        this.store.set(uuid, {
            text,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    async takeAndDelete(uuid: string): Promise<string | null> {
        const entry = this.store.get(uuid);
        if (!entry) return null;

        // Always delete — one-time use
        this.store.delete(uuid);

        // Check expiry
        if (entry.expiresAt < Date.now()) return null;

        return entry.text;
    }
}

// ---------------------------------------------------------------------------
// Redis implementation (production)
// ---------------------------------------------------------------------------
class RedisCaptchaStore implements CaptchaStore {
    private redis: import("@upstash/redis").Redis | null = null;

    private async getRedis() {
        if (!this.redis) {
            const { Redis } = await import("@upstash/redis");
            this.redis = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL!,
                token: process.env.UPSTASH_REDIS_REST_TOKEN!,
            });
        }
        return this.redis;
    }

    async set(uuid: string, text: string, ttlSeconds: number): Promise<void> {
        const redis = await this.getRedis();
        await redis.set(`captcha:${uuid}`, text, { ex: ttlSeconds });
    }

    async takeAndDelete(uuid: string): Promise<string | null> {
        const redis = await this.getRedis();
        // GETDEL is atomic get + delete
        const result = await redis.getdel<string>(`captcha:${uuid}`);
        return result ?? null;
    }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
let storeInstance: CaptchaStore | null = null;

export function getCaptchaStore(): CaptchaStore {
    if (!storeInstance) {
        if (
            process.env.UPSTASH_REDIS_REST_URL &&
            process.env.UPSTASH_REDIS_REST_TOKEN
        ) {
            storeInstance = new RedisCaptchaStore();
        } else {
            // dev-only: in-memory store — entries lost on server restart
            storeInstance = new InMemoryCaptchaStore();
        }
    }
    return storeInstance;
}

// ---------------------------------------------------------------------------
// Generate captcha SVG
// ---------------------------------------------------------------------------
const CAPTCHA_TTL_SECONDS = 5 * 60; // 5 minutes

export function generateCaptchaSvg(): { text: string; svg: string } {
    const captcha = svgCaptcha.create({
        size: 5,
        noise: 2,
        color: true,
        background: "#111827",
        ignoreChars: "0oO1iIl",
    });

    return {
        text: captcha.text.toLowerCase(),
        svg: captcha.data,
    };
}

export async function storeCaptcha(uuid: string, text: string): Promise<void> {
    const store = getCaptchaStore();
    await store.set(uuid, text, CAPTCHA_TTL_SECONDS);
}

export async function verifyCaptcha(
    uuid: string,
    userInput: string,
): Promise<{ ok: boolean; code?: string }> {
    const store = getCaptchaStore();
    const storedText = await store.takeAndDelete(uuid);

    if (storedText === null) {
        return { ok: false, code: "CAPTCHA_EXPIRED" };
    }

    if (userInput.toLowerCase() !== storedText) {
        return { ok: false, code: "CAPTCHA_WRONG" };
    }

    return { ok: true };
}
