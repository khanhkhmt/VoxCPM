"use client";

import Link from "next/link";
import Image from "next/image";

interface LogoProps {
    className?: string;
    iconOnly?: boolean;
}

export default function Logo({ className = "", iconOnly = false }: LogoProps) {
    const LOGO_ICON = "/oriagent-icon.svg";

    return (
        <Link href="/" className={`flex items-center gap-2 group ${className}`}>
            <div className="relative w-8 h-8 shrink-0">
                <Image
                    src={LOGO_ICON}
                    alt="Oriagent"
                    width={32}
                    height={32}
                    className="object-contain rounded-lg"
                    unoptimized
                />
            </div>
            {!iconOnly && (
                <span className="text-xl font-bold tracking-tight text-white">Oriagent</span>
            )}
        </Link>
    );
}
