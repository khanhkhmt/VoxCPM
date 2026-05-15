// Map error codes from the OAuth callback redirect (?error=...) to
// user-facing messages displayed on the login/register pages.
export const GOOGLE_AUTH_ERROR_MESSAGES: Record<string, string> = {
    google_oauth_denied: "Bạn đã hủy đăng nhập Google.",
    google_missing_code: "Google không trả mã xác thực. Vui lòng thử lại.",
    google_invalid_state: "Phiên đăng nhập không hợp lệ. Vui lòng thử lại.",
    google_no_email: "Không lấy được email từ Google.",
    google_email_not_verified: "Email Google chưa được xác minh.",
    google_token_exchange_failed: "Không thể xác thực với Google. Vui lòng thử lại.",
    google_profile_failed: "Không lấy được thông tin tài khoản Google.",
    google_login_failed: "Đăng nhập Google thất bại. Vui lòng thử lại.",
    google_not_configured: "Đăng nhập Google chưa được cấu hình trên máy chủ.",
};

export function getGoogleAuthErrorMessage(code: string | null | undefined): string | null {
    if (!code) return null;
    return GOOGLE_AUTH_ERROR_MESSAGES[code] ?? "Đăng nhập Google thất bại. Vui lòng thử lại.";
}
