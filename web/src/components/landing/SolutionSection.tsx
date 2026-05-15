"use client";

import { Sparkles, Mic, Wand2, KeyRound } from "lucide-react";
import { useI18n } from "@/i18n";

/**
 * Solution section: four numbered steps describing the studio workflow.
 * Layout: 2x2 on md+, single column on mobile.
 */
export default function SolutionSection() {
    const { t } = useI18n();

    const steps = [
        {
            number: t.landing.solution.steps.design.number,
            icon: <Sparkles size={20} className="text-vox-primary" />,
            title: t.landing.solution.steps.design.title,
            desc: t.landing.solution.steps.design.desc,
        },
        {
            number: t.landing.solution.steps.controllable.number,
            icon: <Mic size={20} className="text-vox-secondary" />,
            title: t.landing.solution.steps.controllable.title,
            desc: t.landing.solution.steps.controllable.desc,
        },
        {
            number: t.landing.solution.steps.ultimate.number,
            icon: <Wand2 size={20} className="text-fuchsia-500" />,
            title: t.landing.solution.steps.ultimate.title,
            desc: t.landing.solution.steps.ultimate.desc,
        },
        {
            number: t.landing.solution.steps.api.number,
            icon: <KeyRound size={20} className="text-emerald-500" />,
            title: t.landing.solution.steps.api.title,
            desc: t.landing.solution.steps.api.desc,
        },
    ];

    return (
        <section id="solution" className="py-24 lg:py-28 border-t border-vox-outline/20 bg-vox-surface/40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-12 gap-12 mb-14">
                    <div className="lg:col-span-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-vox-secondary mb-4">
                            {t.landing.solution.eyebrow}
                        </div>
                        <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-vox-heading leading-[1.15]">
                            {t.landing.solution.title}
                        </h2>
                    </div>
                    <div className="lg:col-span-7 flex items-end">
                        <p className="text-base lg:text-lg text-vox-text-dim leading-relaxed">
                            {t.landing.solution.subtitle}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                    {steps.map((step) => (
                        <article
                            key={step.number}
                            className="ori-card p-6 flex gap-5 transition-colors hover:border-vox-outline"
                        >
                            <div className="flex flex-col items-start gap-3 min-w-[64px]">
                                <span className="text-xs font-mono tracking-widest text-vox-text-dim">
                                    {step.number}
                                </span>
                                <div className="w-10 h-10 rounded-lg bg-vox-surface flex items-center justify-center border border-vox-outline/50">
                                    {step.icon}
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-vox-heading mb-2">
                                    {step.title}
                                </h3>
                                <p className="text-sm text-vox-text-dim leading-relaxed">{step.desc}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
