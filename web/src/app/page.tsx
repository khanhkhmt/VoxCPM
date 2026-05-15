"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LandingHero from "@/components/landing/LandingHero";
import ProblemSection from "@/components/landing/ProblemSection";
import SolutionSection from "@/components/landing/SolutionSection";
import WorkflowSection from "@/components/landing/WorkflowSection";
import EnterpriseSection from "@/components/landing/EnterpriseSection";
import ResultsSection from "@/components/landing/ResultsSection";
import FaqSection from "@/components/landing/FaqSection";
import FinalCta from "@/components/landing/FinalCta";

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col bg-vox-bg relative overflow-hidden">
            {/* Background ambient lights — dimmed for the lighter landing feel */}
            <div
                className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-vox-primary/10 blur-[120px] pointer-events-none"
                aria-hidden
            />
            <div
                className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-vox-secondary/5 blur-[100px] pointer-events-none"
                aria-hidden
            />

            <Header />

            <main className="flex-grow">
                <LandingHero />
                <ProblemSection />
                <SolutionSection />
                <WorkflowSection />
                <EnterpriseSection />
                <ResultsSection />
                <FaqSection />
                <FinalCta />
            </main>

            <Footer />
        </div>
    );
}
