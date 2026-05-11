import { getCurrentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { getQuotaStatus } from "@/lib/quota";
import DeveloperApiPanel from "@/components/studio/DeveloperApiPanel";

export const metadata = {
    title: "Developer API | VoxCPM Studio",
    description: "Manage per-voice API keys and access developer documentation.",
};

export default async function DeveloperPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    const quota = await getQuotaStatus(user.id);
    const safeQuota = quota || {
        limit: 1000,
        used: 0,
        remaining: 1000,
        resetDate: new Date().toISOString()
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-6">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-vox-heading tracking-tight">Developer API</h1>
                <p className="text-vox-text-dim mt-2 text-lg">
                    Manage your per-voice API keys and integrate VoxCPM TTS into your applications.
                </p>
            </header>

            <DeveloperApiPanel initialQuota={safeQuota} />
        </div>
    );
}
