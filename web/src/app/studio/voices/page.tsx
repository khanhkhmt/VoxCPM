import VoiceLibrary from "@/components/studio/VoiceLibrary";

export const metadata = {
  title: "Voice Library — Voxora Studio",
  description: "Manage your voice profiles for TTS synthesis",
};

export default function VoicesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vox-heading">Voice Library</h1>
        <p className="text-sm text-vox-text-dim mt-1">
          Upload and manage reference voices for speech synthesis.
        </p>
      </div>
      <VoiceLibrary />
    </div>
  );
}
