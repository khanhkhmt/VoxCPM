"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
    name: string;
    email: string;
    avatar: string;
}

interface AuthContextType {
    user: User | null;
    isLoggedIn: boolean;
    login: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    // Try to load simulated auth from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("voxora_mock_auth");
        if (saved) {
            setUser(JSON.parse(saved));
        }
    }, []);

    const login = () => {
        // MOCK: simulate Google OAuth login
        const mockUser = {
            name: "Demo User",
            email: "demo@voxora.com",
            avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Voxora"
        };
        setUser(mockUser);
        localStorage.setItem("voxora_mock_auth", JSON.stringify(mockUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("voxora_mock_auth");
    };

    return (
        <AuthContext.Provider value= {{ user, isLoggedIn: !!user, login, logout }
}>
    { children }
    </AuthContext.Provider>
  );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
