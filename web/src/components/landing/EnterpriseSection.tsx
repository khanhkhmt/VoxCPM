"use client";

import { Globe2, FolderOpen, Terminal, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n";

/**
 * Enterprise section — 2x2 grid of feature cards explaining why teams adopt VoxCPM.
 * Slots between Workflow and Results to match the Voxera-style section rhythm.
 */
export default function EnterpriseSection() {
    const { t } = useI18n();

    const cards = [
        {
            icon: <Globe2 size={20} className="text-vox-secondary" />,
            tint: "bg-vox-secondary/10 border-vox-secondary/30",
            title: t.landing.enterprise.cards.multilingual.title,
            desc: t.landing.enterprise.cards.multilingual.desc,
        },
        {
            icon: <FolderOpen size={20} className="text-vox-primary" />,
            tint: "bg-vox-primary/10 border-vox-primary/30",
            title: t.landing.enterprise.cards.profiles.title,
            desc: t.landing.enterprise.cards.profiles.desc,
        },
        {
            icon: <Terminal size={20} className="text-emerald-500" />,
            tint: "bg-emerald-500/10 border-emerald-500/30",
            title: t.landing.enterprise.cards.api.title,
            desc: t.landing.enterprise.cards.api.desc,
        },
        {
            icon: <ShieldCheck size={20} className="text-fuchsia-500" />,
            tint: "bg-fuchsia-500/10 border-fuchsia-500/30",
            title: t.landing.enterprise.cards.proxy.title,
            desc: t.landing.enterprise.cards.proxy.desc,
        },
    ];

    return (
        <section id="enterprise" className="py-24 lg:py-28 border-t border-vox-outline/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-12 gap-12 mb-14">
                    <div className="lg:col-span-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-vox-secondary mb-4">
                            {t.landing.enterprise.eyebrow}
                        </div>
                        <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-vox-heading leading-[1.15]">
                            {t.landing.enterprise.title}
                        </h2>
                    </div>
                    <div className="lg:col-span-7 flex items-end">
                        <p className="text-base lg:text-lg text-vox-text-dim leading-relaxed">
                            {t.landing.enterprise.subtitle}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                    {cards.map((card) => (
                        <article
                            key={card.title}
                            className="ori-card p-7 flex gap-5 transition-colors hover:border-vox-outline"
                        >
                            <div
                                className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${card.tint}`}
                            >
                                {card.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-vox-heading mb-2">
                                    {card.title}
                                </h3>
                                <p className="text-sm text-vox-text-dim leading-relaxed">{card.desc}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
