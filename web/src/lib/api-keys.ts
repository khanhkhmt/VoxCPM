import crypto from "crypto";

/**
 * Sinh khóa API dạng plaintext cho voice clone.
 * Format: vc_sk_live_xxxxxxxxx (vc = Voice Clone, sk = Secret Key, live = Production)
 */
export function generatePlainApiKey(): string {
    const randomBytes = crypto.randomBytes(32).toString("base64url");
    return `vc_sk_live_${randomBytes}`;
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
