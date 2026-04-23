import HistoryList from "@/components/studio/HistoryList";

export const metadata = {
  title: "History — Voxora Studio",
  description: "View your TTS generation history",
};

export default function HistoryPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vox-heading">Generation History</h1>
        <p className="text-sm text-vox-text-dim mt-1">
          Browse and manage all your past speech syntheses.
        </p>
      </div>
      <HistoryList />
    </div>
  );
}
