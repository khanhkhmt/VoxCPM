"use client";

import Workspace from "@/components/studio/Workspace";
import { useI18n } from "@/i18n";

export default function StudioPage() {
    const { t } = useI18n();

    return (
        <div className="w-full pb-14">
            <header className="mb-6">
                <h1 className="text-[20px] font-bold text-vox-text tracking-tight mb-1">
                    {t.studio.newSynthesis.title}
                </h1>
                <p className="text-[13px] text-vox-text-dim leading-relaxed">
                    {t.studio.newSynthesis.subtitle}
                </p>
            </header>

            <Workspace />
        </div>
    );
}
