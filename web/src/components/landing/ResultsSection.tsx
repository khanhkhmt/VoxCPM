"use client";

import { useI18n } from "@/i18n";

/**
 * Results section — premium metric strip mirroring Voxera's "Built for production"
 * cadence. Each card uses an oversized orange display number with a short label
 * and one-line description.
 */
export default function ResultsSection() {
    const { t } = useI18n();

    const items = [
        {
            value: t.landing.results.items.modes.value,
            label: t.landing.results.items.modes.label,
            desc: t.landing.results.items.modes.desc,
        },
        {
            value: t.landing.results.items.fidelity.value,
            label: t.landing.results.items.fidelity.label,
            desc: t.landing.results.items.fidelity.desc,
        },
        {
            value: t.landing.results.items.api.value,
            label: t.landing.results.items.api.label,
            desc: t.landing.results.items.api.desc,
        },
        {
            value: t.landing.results.items.profiles.value,
            label: t.landing.results.items.profiles.label,
            desc: t.landing.results.items.profiles.desc,
        },
    ];

    return (
        <section
            id="results"
            className="relative py-24 lg:py-28 border-t border-vox-outline/20 bg-vox-surface/40 overflow-hidden"
        >
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[55%] rounded-full bg-vox-primary/8 blur-[140px] pointer-events-none"
                aria-hidden
            />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mb-14">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-vox-secondary mb-4">
                        {t.landing.results.eyebrow}
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-vox-heading mb-5 leading-[1.15]">
                        {t.landing.results.title}
                    </h2>
                    <p className="text-base lg:text-lg text-vox-text-dim leading-relaxed">
                        {t.landing.results.subtitle}
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {items.map((item) => (
                        <article
                            key={item.label}
                            className="ori-card p-7 flex flex-col gap-3 transition-colors hover:border-vox-outline"
                        >
                            <div className="text-4xl lg:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-vox-primary to-vox-primary-dim leading-none">
                                {item.value}
                            </div>
                            <div className="text-sm font-semibold text-vox-heading">
                                {item.label}
                            </div>
                            <p className="text-sm text-vox-text-dim leading-relaxed">
                                {item.desc}
                            </p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
