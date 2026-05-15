"use client";

import { Volume2, Layers, Cable } from "lucide-react";
import { useI18n } from "@/i18n";

/**
 * Problem section: three cards explaining the pain points VoxCPM solves.
 * Uses `.ori-card` primitive + Tailwind tokens for theme-agnostic styling.
 */
export default function ProblemSection() {
    const { t } = useI18n();

    const cards = [
        {
            icon: <Volume2 size={20} className="text-vox-primary" />,
            title: t.landing.problem.cards.flat.title,
            desc: t.landing.problem.cards.flat.desc,
        },
        {
            icon: <Layers size={20} className="text-vox-secondary" />,
            title: t.landing.problem.cards.fragmented.title,
            desc: t.landing.problem.cards.fragmented.desc,
        },
        {
            icon: <Cable size={20} className="text-emerald-500" />,
            title: t.landing.problem.cards.api.title,
            desc: t.landing.problem.cards.api.desc,
        },
    ];

    return (
        <section id="problem" className="py-24 lg:py-28 border-t border-vox-outline/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mb-14">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-vox-secondary mb-4">
                        {t.landing.problem.eyebrow}
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-vox-heading mb-5 leading-[1.15]">
                        {t.landing.problem.title}
                    </h2>
                    <p className="text-base lg:text-lg text-vox-text-dim leading-relaxed">
                        {t.landing.problem.subtitle}
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-5">
                    {cards.map((card) => (
                        <article
                            key={card.title}
                            className="ori-card p-6 flex flex-col gap-4 transition-colors hover:border-vox-outline"
                        >
                            <div className="w-10 h-10 rounded-lg bg-vox-surface flex items-center justify-center border border-vox-outline/50">
                                {card.icon}
                            </div>
                            <h3 className="text-lg font-semibold text-vox-heading">{card.title}</h3>
                            <p className="text-sm text-vox-text-dim leading-relaxed">{card.desc}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
