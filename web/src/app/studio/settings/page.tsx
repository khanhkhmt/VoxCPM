import { getCurrentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { getQuotaStatus } from "@/lib/quota";
import SettingsContent from "@/components/studio/SettingsContent";

export const metadata = {
    title: "Settings | VoxCPM Studio",
    description: "Manage your account settings, security, and preferences.",
};

export default async function SettingsPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const quota = await getQuotaStatus(user.id);
    const safeQuota = quota || { limit: 500000, used: 0, remaining: 500000, resetDate: new Date().toISOString() };

    return <SettingsContent quota={safeQuota} />;
}
