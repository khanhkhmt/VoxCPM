"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Mic, LayoutDashboard, History, Settings, PanelLeftClose, PanelLeft, LogOut } from "lucide-react";
import { useState } from "react";
import Logo from "@/components/Logo";

export default function Sidebar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const links = [
        { name: "Studio", href: "/studio", icon: LayoutDashboard },
        { name: "Voice Library", href: "/studio/voices", icon: Mic },
        { name: "History", href: "/studio/history", icon: History },
        { name: "Settings", href: "#", icon: Settings },
    ];

    return (
        <div className={`h-screen flex flex-col bg-vox-surface-low border-r border-vox-outline/20 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
            <div className="h-20 flex items-center justify-between px-4 border-b border-vox-outline/20">
                <div className="px-2 w-full flex justify-center md:block pt-1">
                    <Logo iconOnly={collapsed} />
                </div>

                <button onClick={() => setCollapsed(!collapsed)} className="text-vox-text-dim hover:text-white p-1 rounded-md absolute -right-3 top-6 bg-vox-surface border border-vox-outline/30 z-10 hidden md:block">
                    {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
                </button>
            </div>

            <div className="flex-1 py-6 px-3 flex flex-col gap-2">
                {links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive ? 'bg-vox-primary/10 text-white' : 'text-vox-text-dim hover:bg-vox-surface hover:text-white'}`}
                        >
                            <link.icon size={20} className={isActive ? 'text-vox-primary' : 'text-vox-text-dim group-hover:text-vox-secondary'} />
                            {!collapsed && <span className="font-medium text-sm">{link.name}</span>}
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t border-vox-outline/20">
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} bg-vox-surface rounded-xl p-2`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={user?.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${user?.username}`} alt="Avatar" className="w-10 h-10 rounded-full bg-vox-surface-high border border-vox-outline/20" />
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                            <p className="text-xs text-vox-text-dim truncate">{user?.username}</p>
                        </div>
                    )}
                </div>
                {!collapsed && (
                    <button onClick={logout} className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-vox-text-dim hover:text-red-400 hover:bg-vox-surface-highest rounded-lg transition-colors">
                        <LogOut size={16} /> Sign out
                    </button>
                )}
            </div>
        </div>
    );
}
