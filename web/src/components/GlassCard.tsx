import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    interactive?: boolean;
}

export function GlassCard({ children, interactive = false, className, ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                "rounded-2xl p-6",
                interactive ? "glass-card" : "glass-panel",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
