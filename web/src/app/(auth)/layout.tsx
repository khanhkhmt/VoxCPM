import Logo from "@/components/Logo";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col bg-vox-bg relative overflow-hidden">
            {/* Background ambient lights */}
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-vox-primary/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-vox-secondary/5 blur-[100px] pointer-events-none" />

            {/* Simple header */}
            <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6">
                <Logo />
            </header>

            {/* Centered content */}
            <main className="flex-1 flex items-center justify-center px-4 pt-16 pb-8">
                {children}
            </main>

            {/* Minimal footer */}
            <footer className="text-center py-4 text-xs text-vox-text-dim">
                &copy; {new Date().getFullYear()} Oriagent. All rights reserved.
            </footer>
        </div>
    );
}
