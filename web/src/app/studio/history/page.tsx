"use client";

import HistoryList from "@/components/studio/HistoryList";
import { useI18n } from "@/i18n";

export default function HistoryPage() {
  const { t } = useI18n();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vox-heading">{t.history.title}</h1>
        <p className="text-sm text-vox-text-dim mt-1">
          {t.history.subtitle}
        </p>
      </div>
      <HistoryList />
    </div>
  );
}
