"use client";

import { Mic2, Sliders, FileAudio2 } from "lucide-react";
import { useI18n } from "@/i18n";

/**
 * Workflow section with a self-drawn static mockup of the studio interface.
 *
 * Why static: the .md spec asks for a non-interactive preview here so the
 * page stays light and reliable; the real interactive studio lives at /studio
 * (and is teased separately by the hero's DemoTTSBox).
 */
export default function WorkflowSection() {
    const { t } = useI18n();
    const m = t.landing.workflow.mockup;

    return (
        <section id="workflow" className="py-24 lg:py-28 border-t border-vox-outline/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mb-14">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-vox-secondary mb-4">
                        {t.landing.workflow.eyebrow}
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-vox-heading mb-5 leading-[1.15]">
                        {t.landing.workflow.title}
                    </h2>
                    <p className="text-base lg:text-lg text-vox-text-dim leading-relaxed">
                        {t.landing.workflow.subtitle}
                    </p>
                </div>

                <div className="ori-card overflow-hidden shadow-[0_24px_80px_-32px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center gap-1.5 px-5 py-3 border-b border-vox-outline/50 bg-vox-surface/60">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                        <span className="text-[11px] text-vox-text-dim ml-3 font-mono">
                            voxcpm-studio / new-synthesis
                        </span>
                    </div>

                    <div className="grid lg:grid-cols-[1fr_320px] gap-0">
                        <div className="p-6 space-y-5 lg:border-r border-vox-outline/40">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-vox-text-dim">
                                    <Mic2 size={12} /> {m.referenceLabel}
                                </div>
                                <div className="ori-card-body !p-3 flex items-center gap-3 bg-vox-surface/60 rounded-lg border border-vox-outline/50">
                                    <div className="w-9 h-9 rounded-md bg-vox-primary/15 flex items-center justify-center">
                                        <FileAudio2 size={16} className="text-vox-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-vox-text truncate">
                                            {m.referenceValue}
                                        </div>
                                        <div className="text-xs text-vox-text-dim">{m.referenceMeta}</div>
                                    </div>
                                    <div className="flex items-end gap-[2px] h-6">
                                        {[6, 12, 18, 10, 22, 14, 8, 20, 12, 6].map((h, i) => (
                                            <span
                                                key={i}
                                                className="w-[3px] rounded-sm bg-vox-primary/70"
                                                style={{ height: `${h}px` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="text-[11px] uppercase tracking-wider text-vox-text-dim">
                                    {m.controlLabel}
                                </div>
                                <div className="ori-input !bg-vox-surface/60">{m.controlValue}</div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-vox-text-dim">
                                    <span>{m.textLabel}</span>
                                    <span className="font-mono normal-case text-vox-text-dim/80">
                                        {m.counter}
                                    </span>
                                </div>
                                <div className="ori-input !bg-vox-surface/60 min-h-[88px] whitespace-pre-wrap leading-relaxed">
                                    {m.textValue}
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-vox-outline/40">
                                <div className="text-[11px] uppercase tracking-wider text-vox-text-dim">
                                    {m.outputLabel}
                                </div>
                                <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-vox-surface/60 border border-vox-outline/50">
                                    <button
                                        type="button"
                                        className="w-9 h-9 rounded-full bg-vox-primary text-white flex items-center justify-center shrink-0"
                                        aria-label="Play preview"
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 14 14"
                                            fill="currentColor"
                                            aria-hidden
                                        >
                                            <path d="M3 1.5v11l9-5.5z" />
                                        </svg>
                                    </button>
                                    <div className="flex items-end gap-[2px] h-7 flex-1">
                                        {[8, 14, 20, 12, 24, 18, 10, 22, 16, 8, 14, 20, 12, 18, 10, 22, 14, 8, 16, 12]
                                            .map((h, i) => (
                                                <span
                                                    key={i}
                                                    className={`w-[3px] rounded-sm ${
                                                        i < 12 ? "bg-vox-primary/80" : "bg-vox-outline"
                                                    }`}
                                                    style={{ height: `${h}px` }}
                                                />
                                            ))}
                                    </div>
                                    <span className="text-[11px] font-mono text-vox-text-dim">
                                        {m.outputMeta}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <aside className="p-6 space-y-5 bg-vox-surface/30">
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-vox-text-dim">
                                <Sliders size={12} /> {m.settingsLabel}
                            </div>

                            <SettingRow label={m.settingLanguage} value={m.settingLanguageValue} />
                            <SettingSlider label={m.settingCfg} value={m.settingCfgValue} fill={0.45} />
                            <SettingSlider label={m.settingSteps} value={m.settingStepsValue} fill={0.65} />

                            <button
                                type="button"
                                className="ori-btn ori-btn-accent w-full justify-center !py-3 !text-sm pointer-events-none"
                                aria-disabled
                            >
                                {m.generate}
                            </button>
                        </aside>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-5 mt-10">
                    <Pillar
                        title={t.landing.workflow.pillars.canvas.title}
                        desc={t.landing.workflow.pillars.canvas.desc}
                    />
                    <Pillar
                        title={t.landing.workflow.pillars.control.title}
                        desc={t.landing.workflow.pillars.control.desc}
                    />
                    <Pillar
                        title={t.landing.workflow.pillars.export.title}
                        desc={t.landing.workflow.pillars.export.desc}
                    />
                </div>
            </div>
        </section>
    );
}

function SettingRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-vox-text-dim">{label}</span>
            <span className="text-vox-text font-medium">{value}</span>
        </div>
    );
}

function SettingSlider({
    label,
    value,
    fill,
}: {
    label: string;
    value: string;
    fill: number;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="text-vox-text-dim">{label}</span>
                <span className="text-vox-text font-mono text-xs">{value}</span>
            </div>
            <div className="h-[3px] rounded-full bg-vox-outline/60 relative">
                <div
                    className="absolute inset-y-0 left-0 rounded-full bg-vox-primary"
                    style={{ width: `${Math.round(fill * 100)}%` }}
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-vox-primary shadow"
                    style={{ left: `calc(${Math.round(fill * 100)}% - 6px)` }}
                />
            </div>
        </div>
    );
}

function Pillar({ title, desc }: { title: string; desc: string }) {
    return (
        <div className="rounded-xl border border-vox-outline/40 p-5 bg-vox-bg/60">
            <h4 className="text-sm font-semibold text-vox-heading mb-2">{title}</h4>
            <p className="text-xs text-vox-text-dim leading-relaxed">{desc}</p>
        </div>
    );
}
