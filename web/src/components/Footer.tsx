"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useI18n } from "@/i18n";

export default function Footer() {
    const { t } = useI18n();

    return (
        <footer className="bg-vox-bg pt-20 pb-10 border-t border-vox-outline/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
                    <div className="col-span-2 md:col-span-1">
                        <Logo className="mb-4" />
                        <p className="text-sm text-vox-text-dim mb-6 max-w-xs">
                            {t.landing.footer.description}
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-vox-text">{t.landing.footer.product}</h4>
                        <ul className="space-y-3">
                            <li><Link href="#problem" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.problem}</Link></li>
                            <li><Link href="#solution" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.solution}</Link></li>
                            <li><Link href="#workflow" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.workflow}</Link></li>
                            <li><Link href="#enterprise" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.enterprise}</Link></li>
                            <li><Link href="#results" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.results}</Link></li>
                            <li><Link href="#faq" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.faq}</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-vox-text">{t.landing.footer.resources}</h4>
                        <ul className="space-y-3">
                            <li><Link href="/studio" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.voices}</Link></li>
                            <li><Link href="/studio" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.apiDetails}</Link></li>
                            <li><Link href="/login" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.signIn}</Link></li>
                            <li><Link href="/register" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.getStarted}</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-vox-text">{t.landing.footer.legal}</h4>
                        <ul className="space-y-3">
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.privacyPolicy}</Link></li>
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.termsOfService}</Link></li>
                            <li><Link href="#" className="text-sm text-vox-text-dim hover:text-vox-secondary transition-colors">{t.landing.footer.cookiePolicy}</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-vox-outline/20 pt-8 flex flex-col md:flex-row items-center justify-between">
                    <p className="text-xs text-vox-text-dim">
                        &copy; {new Date().getFullYear()} {t.landing.footer.copyright}
                    </p>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        {/* Social links placeholder */}
                        <div className="w-8 h-8 rounded-full bg-vox-surface flex items-center justify-center text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface-high transition-colors cursor-pointer">
                            𝕏
                        </div>
                        <div className="w-8 h-8 rounded-full bg-vox-surface flex items-center justify-center text-vox-text-dim hover:text-vox-heading hover:bg-vox-surface-high transition-colors cursor-pointer">
                            in
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
