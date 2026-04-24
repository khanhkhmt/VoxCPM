"use client";

import { Users, Activity, Mic, UserCheck, UserX, ShieldCheck } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface StatsData {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    totalGenerations: number;
    totalVoiceProfiles: number;
    recentUsers: number;
    recentGenerations: number;
}

// ---------------------------------------------------------------------------
// Single stat card
// ---------------------------------------------------------------------------
function StatCard({
    label,
    value,
    icon: Icon,
    accent = "vox-primary",
    subtitle,
}: {
    label: string;
    value: number;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    accent?: string;
    subtitle?: string;
}) {
    return (
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 group hover:scale-[1.02] transition-transform duration-200">
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl bg-${accent}/10 flex items-center justify-center`}>
                    <Icon size={20} className={`text-${accent}`} />
                </div>
                {subtitle && (
                    <span className="text-[11px] font-medium text-vox-secondary bg-vox-secondary/10 px-2 py-0.5 rounded-full">
                        {subtitle}
                    </span>
                )}
            </div>
            <div>
                <p className="text-3xl font-bold text-vox-heading tracking-tight">{value.toLocaleString()}</p>
                <p className="text-sm text-vox-text-dim mt-0.5">{label}</p>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// StatsCards grid
// ---------------------------------------------------------------------------
export default function StatsCards({ data }: { data: StatsData }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                label="Total Users"
                value={data.totalUsers}
                icon={Users}
                accent="vox-primary"
            />
            <StatCard
                label="Active Users"
                value={data.activeUsers}
                icon={UserCheck}
                accent="emerald-500"
            />
            <StatCard
                label="Inactive Users"
                value={data.inactiveUsers}
                icon={UserX}
                accent="red-400"
            />
            <StatCard
                label="Admins"
                value={data.adminUsers}
                icon={ShieldCheck}
                accent="amber-500"
            />
            <StatCard
                label="Total Generations"
                value={data.totalGenerations}
                icon={Activity}
                accent="vox-secondary"
                subtitle={`+${data.recentGenerations} last 7d`}
            />
            <StatCard
                label="Voice Profiles"
                value={data.totalVoiceProfiles}
                icon={Mic}
                accent="vox-primary"
            />
            <StatCard
                label="New Users (7 days)"
                value={data.recentUsers}
                icon={Users}
                accent="vox-secondary"
            />
        </div>
    );
}
