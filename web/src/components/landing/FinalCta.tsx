"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n";

/**
 * Final CTA strip just before the footer.
 * Two routes: /register (primary) and /studio (secondary).
 */
export default function FinalCta() {
    const { t } = useI18n();

    return (
        <section className="py-24 lg:py-28 border-t border-vox-outline/20 bg-vox-surface/40">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-vox-heading mb-5 leading-[1.15]">
                    {t.landing.finalCta.title}
                </h2>
                <p className="text-base lg:text-lg text-vox-text-dim mb-10 max-w-2xl mx-auto leading-relaxed">
                    {t.landing.finalCta.subtitle}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Link
                        href="/register"
                        className="group inline-flex items-center gap-2 rounded-xl bg-vox-primary text-white font-medium px-8 py-3.5 shadow-[0_0_20px_rgba(240,104,32,0.25)] hover:shadow-[0_0_30px_rgba(240,104,32,0.4)] transition-shadow"
                    >
                        {t.landing.finalCta.primary}
                        <ArrowRight
                            size={18}
                            className="group-hover:translate-x-1 transition-transform"
                        />
                    </Link>
                    <Link
                        href="/studio"
                        className="px-8 py-3.5 rounded-xl font-medium text-vox-text hover:text-vox-heading border border-vox-outline/60 hover:bg-vox-surface transition-all"
                    >
                        {t.landing.finalCta.secondary}
                    </Link>
                </div>
            </div>
        </section>
    );
}
