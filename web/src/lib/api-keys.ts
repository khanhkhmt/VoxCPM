import crypto from "crypto";

export type ApiKeyEnvironment = "test" | "live";

/**
 * Sinh khóa API dạng plaintext với prefix xác định.
 * Format: vox_sk_test_... hoặc vox_sk_live_...
 */
export function generatePlainApiKey(env: ApiKeyEnvironment): string {
    const randomBytes = crypto.randomBytes(32).toString("base64url");
    return `vox_sk_${env}_${randomBytes}`;
}

/**
 * Băm khóa API để lưu vào CSDL (bảo mật 1 chiều).
 */
export function hashApiKey(plainKey: string): string {
    return crypto.createHash("sha256").update(plainKey).digest("hex");
}

/**
 * Lấy 4 ký tự cuối của plainKey để lưu hiển thị UI.
 */
export function extractLastFour(plainKey: string): string {
    return plainKey.slice(-4);
}

/**
 * Kiểm tra xem list scopes có chứa scope yêu cầu không.
 */
export function hasScope(scopesString: string, requiredScope: string): boolean {
    const scopes = scopesString.split(",").map((s) => s.trim());
    return scopes.includes(requiredScope);
}
