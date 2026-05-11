import { getCurrentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { getQuotaStatus } from "@/lib/quota";
import Link from "next/link";

export const metadata = {
    title: "Settings | VoxCPM Studio",
    description: "Manage your account settings and API keys.",
};

export default async function SettingsPage() {
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

    const quotaPercentage = Math.min(100, (safeQuota.used / safeQuota.limit) * 100);

    return (
        <div className="max-w-6xl mx-auto py-8 px-6">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-vox-heading tracking-tight">Settings</h1>
                <p className="text-vox-text-dim mt-2 text-lg">
                    Manage your account and developer settings.
                </p>
            </header>

            <div className="flex flex-col gap-8">
                {/* Account Info */}
                <section className="bg-vox-surface border border-vox-outline/20 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-vox-heading mb-4">Account Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-vox-surface-low p-4 rounded-xl border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim uppercase tracking-wider font-bold mb-1">Username</p>
                            <p className="text-sm font-medium text-vox-heading">{user.username}</p>
                        </div>
                        <div className="bg-vox-surface-low p-4 rounded-xl border border-vox-outline/10">
                            <p className="text-xs text-vox-text-dim uppercase tracking-wider font-bold mb-1">Name</p>
                            <p className="text-sm font-medium text-vox-heading">{user.name}</p>
                        </div>
                    </div>
                </section>

                {/* Quota Summary */}
                <section className="bg-vox-surface border border-vox-outline/20 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-vox-heading mb-4">Usage Quota</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-vox-text-dim font-medium">Monthly Progress</span>
                            <span className="text-vox-heading font-bold">
                                {safeQuota.used.toLocaleString()} / {safeQuota.limit.toLocaleString()} chars
                            </span>
                        </div>
                        <div className="w-full h-3 bg-vox-surface-low rounded-full overflow-hidden border border-vox-outline/10">
                            <div
                                className={`h-full transition-all duration-1000 ease-out rounded-full ${
                                    quotaPercentage > 90 ? "bg-red-500" : quotaPercentage > 70 ? "bg-amber-500" : "bg-vox-primary"
                                }`}
                                style={{ width: `${quotaPercentage}%` }}
                            />
                        </div>
                        <p className="text-xs text-vox-text-dim">
                            Resets on {new Date(safeQuota.resetDate).toLocaleDateString()}
                        </p>
                    </div>
                </section>

                {/* Developer API Link */}
                <section className="bg-vox-surface border border-vox-outline/20 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-vox-heading mb-2">Developer API</h2>
                    <p className="text-sm text-vox-text-dim mb-4">
                        Manage your per-voice API keys and access documentation for integrating VoxCPM into your applications.
                    </p>
                    <Link
                        href="/studio/developer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-vox-primary hover:bg-vox-primary/90 text-white font-bold rounded-xl transition-colors text-sm"
                    >
                        Go to Developer API
                    </Link>
                </section>
            </div>
        </div>
    );
}
