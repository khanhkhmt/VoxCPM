"use client";

import AuthLayout from "@/components/auth/AuthLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
    return <AuthLayout>{children}</AuthLayout>;
}
