"use client";

import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";
import { useI18n } from "@/i18n";
import DemoTTSBox from "@/components/DemoTTSBox";

/**
 * Hero block of the landing page.
 *
 * Layout: 2-column on lg+ (copy left, interactive DemoTTSBox right),
 * stacked on smaller screens. Mirrors the voice-agent SaaS landing structure
 * while reusing existing vox tokens so it works in both light and dark themes.
 */
export default function LandingHero() {
    const { t } = useI18n();

    return (
        <section className="relative pt-32 pb-20 lg:pt-36 lg:pb-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-7">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-vox-secondary/30 bg-vox-secondary/5 mb-6">
                            <Activity size={14} className="text-vox-secondary" />
                            <span className="text-xs font-semibold tracking-wider text-vox-secondary uppercase">
                                {t.landing.badge}
                            </span>
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-vox-heading mb-6 leading-[1.05]">
                            {t.landing.hero.title}
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-vox-primary-dim to-vox-secondary">
                                {t.landing.hero.titleHighlight}
                            </span>
                        </h1>

                        <p className="text-lg text-vox-text-dim mb-8 max-w-xl leading-relaxed">
                            {t.landing.hero.subtitle}
                        </p>

                        <div className="flex flex-wrap items-center gap-4">
                            <Link
                                href="/register"
                                className="relative group overflow-hidden rounded-xl bg-vox-primary text-white font-medium px-8 py-3.5 transition-all shadow-[0_0_20px_rgba(240,104,32,0.25)] hover:shadow-[0_0_30px_rgba(240,104,32,0.4)]"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {t.landing.hero.startFree}
                                    <ArrowRight
                                        size={18}
                                        className="group-hover:translate-x-1 transition-transform"
                                    />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-vox-primary to-vox-secondary opacity-0 group-hover:opacity-100 transition-opacity z-0" />
                            </Link>

                            <Link
                                href="#demo"
                                className="px-8 py-3.5 rounded-xl font-medium text-vox-text hover:text-vox-heading border border-vox-outline/60 hover:bg-vox-surface transition-all"
                            >
                                {t.landing.hero.tryDemo}
                            </Link>
                        </div>
                    </div>

                    <div className="lg:col-span-5 relative" id="demo">
                        <div className="lg:-mr-12 relative z-10">
                            <DemoTTSBox />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
