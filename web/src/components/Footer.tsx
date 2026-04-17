import Link from "next/link";
import Logo from "@/components/Logo";

export default function Footer() {
    return (
        <footer className="bg-vox-bg pt-20 pb-10 border-t border-vox-outline/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
                    <div className="col-span-2 md:col-span-1">
                        <Logo className="mb-4" />
                        <p className="text-sm text-vox-text-dim mb-6 max-w-xs">
                            Transforming the way software speaks, from prototype to production. Powered by Oriagent AI technology.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-vox-text">Product</h4>
                        <ul className="space-y-3">
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Features</Link></li>
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Voices</Link></li>
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Pricing</Link></li>
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">API Details</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-vox-text">Resources</h4>
                        <ul className="space-y-3">
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Documentation</Link></li>
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Tutorials</Link></li>
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Blog</Link></li>
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Community</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-vox-text">Legal</h4>
                        <ul className="space-y-3">
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Privacy Policy</Link></li>
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Terms of Service</Link></li>
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">Cookie Policy</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-vox-outline/20 pt-8 flex flex-col md:flex-row items-center justify-between">
                    <p className="text-xs text-vox-text-dim">
                        &copy; {new Date().getFullYear()} Oriagent. All rights reserved.
                    </p>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        {/* Social links placeholder */}
                        <div className="w-8 h-8 rounded-full bg-vox-surface flex items-center justify-center text-vox-text-dim hover:text-white hover:bg-vox-surface-high transition-colors cursor-pointer">
                            𝕏
                        </div>
                        <div className="w-8 h-8 rounded-full bg-vox-surface flex items-center justify-center text-vox-text-dim hover:text-white hover:bg-vox-surface-high transition-colors cursor-pointer">
                            in
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
