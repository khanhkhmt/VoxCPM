"use client";

import VoiceLibrary from "@/components/studio/VoiceLibrary";
import { useI18n } from "@/i18n";

export default function VoicesPage() {
  const { t } = useI18n();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vox-heading">{t.voiceLibrary.title}</h1>
        <p className="text-sm text-vox-text-dim mt-1">
          {t.voiceLibrary.subtitle}
        </p>
      </div>
      <VoiceLibrary />
    </div>
  );
}
