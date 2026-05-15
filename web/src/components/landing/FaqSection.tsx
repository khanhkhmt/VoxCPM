"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useI18n } from "@/i18n";

/**
 * FAQ section with accessible accordion items.
 * Each item is a <details> for native semantics + zero JS dependency,
 * styled with the ori-card primitive.
 */
export default function FaqSection() {
    const { t } = useI18n();

    const items = [
        { id: "what", q: t.landing.faq.items.what.q, a: t.landing.faq.items.what.a },
        { id: "clone", q: t.landing.faq.items.clone.q, a: t.landing.faq.items.clone.a },
        {
            id: "multilingual",
            q: t.landing.faq.items.multilingual.q,
            a: t.landing.faq.items.multilingual.a,
        },
        { id: "api", q: t.landing.faq.items.api.q, a: t.landing.faq.items.api.a },
        { id: "backend", q: t.landing.faq.items.backend.q, a: t.landing.faq.items.backend.a },
        { id: "profiles", q: t.landing.faq.items.profiles.q, a: t.landing.faq.items.profiles.a },
    ];

    const [open, setOpen] = useState<string | null>("what");

    return (
        <section id="faq" className="py-24 lg:py-28 border-t border-vox-outline/20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-vox-secondary mb-4">
                        {t.landing.faq.eyebrow}
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-vox-heading leading-[1.15]">
                        {t.landing.faq.title}
                    </h2>
                </div>

                <div className="space-y-3">
                    {items.map((item) => {
                        const isOpen = open === item.id;
                        return (
                            <div
                                key={item.id}
                                className={`ori-card transition-colors ${
                                    isOpen ? "border-vox-outline" : ""
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpen(isOpen ? null : item.id)}
                                    aria-expanded={isOpen}
                                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                                >
                                    <span className="text-base font-medium text-vox-heading">
                                        {item.q}
                                    </span>
                                    <span className="shrink-0 w-7 h-7 rounded-full bg-vox-surface flex items-center justify-center border border-vox-outline/60 text-vox-text-dim">
                                        {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                                    </span>
                                </button>
                                {isOpen && (
                                    <div className="px-5 pb-5 pt-0 text-sm text-vox-text-dim leading-relaxed border-t border-vox-outline/40">
                                        <p className="pt-4">{item.a}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
