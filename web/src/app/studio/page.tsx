"use client";

import Workspace from "@/components/studio/Workspace";
import { useI18n } from "@/i18n";

export default function StudioPage() {
    const { t } = useI18n();

    return (
        <div className="w-full h-full pb-20">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-vox-heading tracking-tight">{t.studio.newSynthesis.title}</h1>
                    <p className="text-sm text-vox-text-dim mt-1">{t.studio.newSynthesis.subtitle}</p>
                </div>
            </div>

            <Workspace />
        </div>
    );
}
