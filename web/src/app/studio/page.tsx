import Workspace from "@/components/studio/Workspace";

export const metadata = {
    title: "Studio | Voxora TTS",
    description: "Generate lifelike speech using the Voxora TTS dashboard.",
};

export default function StudioPage() {
    return (
        <div className="w-full h-full pb-20">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">New Synthesis</h1>
                    <p className="text-sm text-vox-text-dim mt-1">Design a voice or clone an existing one to generate studio-quality speech.</p>
                </div>
            </div>

            <Workspace />
        </div>
    );
}
