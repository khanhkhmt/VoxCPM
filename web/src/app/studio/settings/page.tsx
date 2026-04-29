import { getCurrentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { getQuotaStatus } from "@/lib/quota";
import ApiKeysPanel from "@/components/studio/ApiKeysPanel";

export const metadata = {
    title: "Settings | VoxCPM Studio",
    description: "Manage your API keys and monitor character quota usage.",
};

export default async function SettingsPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch quota status directly on server side
    const quota = await getQuotaStatus(user.id);

    // If quota for some reason is not initialized, provide a safe fallback
    const safeQuota = quota || {
        limit: 1000,
        used: 0,
        remaining: 1000,
        resetDate: new Date().toISOString()
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-6">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-vox-heading tracking-tight">Settings</h1>
                <p className="text-vox-text-dim mt-2 text-lg">
                    Manage your developer access and monitor your character usage.
                </p>
            </header>

            <ApiKeysPanel initialQuota={safeQuota} />
        </div>
    );
}
