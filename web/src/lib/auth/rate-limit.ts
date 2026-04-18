// ---------------------------------------------------------------------------
// Rate limiting — Upstash if configured, in-memory Map fallback (dev-only)
// ---------------------------------------------------------------------------

interface RateLimitResult {
    success: boolean;
    remaining: number;
}

interface RateLimiter {
    limit(identifier: string): Promise<RateLimitResult>;
}

// ---------------------------------------------------------------------------
// In-memory rate limiter (dev-only — resets on restart)
// ---------------------------------------------------------------------------
class InMemoryRateLimiter implements RateLimiter {
    private store = new Map<string, { count: number; resetAt: number }>();

    constructor(
        private maxRequests: number,
        private windowMs: number,
    ) { }

    async limit(identifier: string): Promise<RateLimitResult> {
        const now = Date.now();
        const entry = this.store.get(identifier);

        if (!entry || entry.resetAt < now) {
            this.store.set(identifier, { count: 1, resetAt: now + this.windowMs });
            return { success: true, remaining: this.maxRequests - 1 };
        }

        entry.count++;
        if (entry.count > this.maxRequests) {
            return { success: false, remaining: 0 };
        }

        return { success: true, remaining: this.maxRequests - entry.count };
    }
}

// ---------------------------------------------------------------------------
// Upstash rate limiter
// ---------------------------------------------------------------------------
class UpstashRateLimiter implements RateLimiter {
    private limiter: import("@upstash/ratelimit").Ratelimit | null = null;

    constructor(
        private maxRequests: number,
        private windowSeconds: number,
    ) { }

    private async getLimiter() {
        if (!this.limiter) {
            const { Ratelimit } = await import("@upstash/ratelimit");
            const { Redis } = await import("@upstash/redis");
            const redis = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL!,
                token: process.env.UPSTASH_REDIS_REST_TOKEN!,
            });
            this.limiter = new Ratelimit({
                redis,
                limiter: Ratelimit.slidingWindow(
                    this.maxRequests,
                    `${this.windowSeconds} s`,
                ),
                analytics: false,
            });
        }
        return this.limiter;
    }

    async limit(identifier: string): Promise<RateLimitResult> {
        const limiter = await this.getLimiter();
        const result = await limiter.limit(identifier);
        return { success: result.success, remaining: result.remaining };
    }
}

// ---------------------------------------------------------------------------
// Factory — creates rate limiters per endpoint configuration
// ---------------------------------------------------------------------------
function createRateLimiter(
    maxRequests: number,
    windowMs: number,
): RateLimiter {
    if (
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
        return new UpstashRateLimiter(maxRequests, windowMs / 1000);
    }
    // dev-only: in-memory — state lost on restart
    return new InMemoryRateLimiter(maxRequests, windowMs);
}

// ---------------------------------------------------------------------------
// Pre-configured limiters
// ---------------------------------------------------------------------------

/** /login: 5 requests per 5 minutes per (IP + email) */
export const loginLimiter = createRateLimiter(5, 5 * 60 * 1000);

/** /register: 3 requests per hour per IP */
export const registerLimiter = createRateLimiter(3, 60 * 60 * 1000);

/** /captcha: 30 requests per minute per IP */
export const captchaLimiter = createRateLimiter(30, 60 * 1000);
