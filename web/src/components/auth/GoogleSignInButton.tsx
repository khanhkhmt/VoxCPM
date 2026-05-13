"use client";

interface GoogleSignInButtonProps {
    label?: string;
    next?: string | null;
}

/**
 * "Sign in with Google" button that triggers a top-level navigation
 * to /api/auth/google, which redirects the user to Google's OAuth flow.
 */
export default function GoogleSignInButton({
    label = "Sign in with Google",
    next,
}: GoogleSignInButtonProps) {
    const href = next ? `/api/auth/google?next=${encodeURIComponent(next)}` : "/api/auth/google";

    return (
        <a
            href={href}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-vox-surface-lowest hover:bg-vox-surface border border-vox-outline/40 hover:border-vox-outline/60 text-vox-text px-6 py-3 text-sm font-medium transition-colors"
            data-testid="google-signin-button"
        >
            <GoogleLogo />
            <span>{label}</span>
        </a>
    );
}

function GoogleLogo({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            aria-hidden="true"
            focusable="false"
        >
            <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303C33.751 32.659 29.273 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
            />
            <path
                fill="#FF3D00"
                d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
            />
            <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.252 0-9.717-3.317-11.286-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
            />
            <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
            />
        </svg>
    );
}
