"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface User {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
    role: "user" | "admin";
}

export interface LoginInput {
    username: string;
    password: string;
    captchaId: string;
    captchaText: string;
}

export interface RegisterInput {
    name: string;
    username: string;
    password: string;
    confirmPassword: string;
    captchaId: string;
    captchaText: string;
}

interface AuthContextType {
    user: User | null;
    isLoggedIn: boolean;
    status: "loading" | "authenticated" | "unauthenticated";
    login(input: LoginInput): Promise<void>;
    register(input: RegisterInput): Promise<void>;
    logout(): Promise<void>;
    refresh(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------
interface ApiError {
    code: string;
    message: string;
}

async function authFetch<T = unknown>(
    url: string,
    options?: RequestInit,
): Promise<T> {
    const res = await fetch(url, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...options,
    });

    const data = await res.json();

    if (!data.ok) {
        const err = data.error as ApiError;
        const error = new Error(err.message);
        (error as Error & { code: string }).code = err.code;
        throw error;
    }

    return data.data as T;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
    const router = useRouter();

    const refresh = useCallback(async () => {
        try {
            const data = await authFetch<{ user: User }>("/api/auth/me");
            setUser(data.user);
            setStatus("authenticated");
        } catch {
            setUser(null);
            setStatus("unauthenticated");
        }
    }, []);

    // Fetch user on mount
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        refresh();
    }, [refresh]);

    const login = useCallback(
        async (input: LoginInput) => {
            await authFetch("/api/auth/login", {
                method: "POST",
                body: JSON.stringify(input),
            });
            await refresh();
        },
        [refresh],
    );

    const register = useCallback(
        async (input: RegisterInput) => {
            await authFetch("/api/auth/register", {
                method: "POST",
                body: JSON.stringify(input),
            });
            await refresh();
        },
        [refresh],
    );

    const logout = useCallback(async () => {
        try {
            await authFetch("/api/auth/logout", { method: "POST" });
        } catch {
            // Even if the API call fails, clear local state
        }
        setUser(null);
        setStatus("unauthenticated");
        router.replace("/");
    }, [router]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoggedIn: status === "authenticated",
                status,
                login,
                register,
                logout,
                refresh,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
