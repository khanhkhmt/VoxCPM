import { describe, it, expect } from "vitest";

// Basic unit tests for validation logic. 
// A real integration test with Next.js App Router route handlers requires either 
// `next/jest` test environment setup or spinning up a test server.

describe("Auth System", () => {

    describe("Validation", () => {
        it("should require strong passwords", async () => {
            const { registerSchema } = await import("@/lib/schemas/auth");

            const weak = registerSchema.safeParse({
                name: "A",
                email: "test@test.com",
                password: "weak",
                confirmPassword: "weak",
                captchaId: "123",
                captchaText: "abc",
            });
            expect(weak.success).toBe(false);

            const strong = registerSchema.safeParse({
                name: "Test User",
                email: "test2@test.com",
                password: "StrongPassword123!",
                confirmPassword: "StrongPassword123!",
                captchaId: "123",
                captchaText: "abc",
            });
            expect(strong.success).toBe(true);
        });
    });
});
