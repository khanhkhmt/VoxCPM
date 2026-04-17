"use client";

import Link from "next/link";
import Image from "next/image";

interface LogoProps {
    className?: string;
    iconOnly?: boolean;
}

export default function Logo({ className = "", iconOnly = false }: LogoProps) {
    return (
        <Link href="/" className={`flex items-center group ${className}`}>
            {!iconOnly ? (
                <div className="relative h-9 w-auto min-w-[150px]">
                    <Image
                        src="/logo_oriagent.svg"
                        alt="Oriagent"
                        fill
                        className="object-contain hover:scale-105 transition-all duration-300"
                        unoptimized
                    />
                </div>
            ) : (
                <div className="relative w-8 h-8">
                    <Image
                        src="/oriagent-icon.svg"
                        alt="Oriagent"
                        width={32}
                        height={32}
                        className="object-contain"
                        unoptimized
                    />
                </div>
            )}
        </Link>
    );
}
