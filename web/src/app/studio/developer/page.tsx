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
            <DeveloperApiPanel initialQuota={safeQuota} />
        </div>
    );
}
