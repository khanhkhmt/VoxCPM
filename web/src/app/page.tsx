import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DemoTTSBox from "@/components/DemoTTSBox";
import { GlassCard } from "@/components/GlassCard";
import { Mic, Globe2, Shapes, Zap, ArrowRight, Activity } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-vox-bg relative overflow-hidden">
      {/* Background ambient lights */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-vox-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-vox-secondary/5 blur-[100px] pointer-events-none" />

      <Header />

      <main className="flex-grow pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Hero Section */}
          <div className="grid lg:grid-cols-12 gap-12 items-center mb-32">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-vox-secondary/30 bg-vox-secondary/5 mb-6">
                <Activity size={14} className="text-vox-secondary" />
                <span className="text-xs font-semibold tracking-wider text-vox-secondary uppercase">Powered by Oriagent AI</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
                Transform Text Into <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-vox-primary-dim to-vox-secondary">Lifelike Speech</span>
              </h1>
              <p className="text-lg text-vox-text-dim mb-8 max-w-xl leading-relaxed">
                The next generation of AI voice synthesis. Generate studio-quality voiceovers, clone voices perfectly, and design entirely new personas with complete emotional control.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/studio" className="relative group overflow-hidden rounded-xl bg-vox-primary text-white font-medium px-8 py-3.5 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]">
                  <span className="relative z-10 flex items-center gap-2">
                    Start creating for free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-vox-primary to-vox-secondary opacity-0 group-hover:opacity-100 transition-opacity z-0" />
                </Link>
                <Link href="#demo" className="px-8 py-3.5 rounded-xl font-medium text-vox-text hover:text-white border border-vox-outline/50 hover:bg-vox-surface transition-all">
                  Try Demo
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 relative" id="demo">
              {/* Asymmetric placement according to design guidelines */}
              <div className="lg:-mr-12 relative z-10">
                <DemoTTSBox />
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-32" id="features">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Unprecedented Control</h2>
              <p className="text-vox-text-dim max-w-2xl mx-auto">Our advanced flow-matching architecture gives you complete mastery over every aspect of generated speech.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <GlassCard interactive className="group">
                <div className="w-12 h-12 rounded-xl bg-vox-primary/10 flex items-center justify-center mb-6 group-hover:bg-vox-primary/20 transition-colors">
                  <Shapes className="text-vox-primary" size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-3">Voice Design</h3>
                <p className="text-vox-text-dim text-sm leading-relaxed">
                  Craft completely new, unique voices by just describing them. &quot;A middle-aged man with a deep, rasping voice.&quot;
                </p>
              </GlassCard>

              <GlassCard interactive className="group">
                <div className="w-12 h-12 rounded-xl bg-vox-secondary/10 flex items-center justify-center mb-6 group-hover:bg-vox-secondary/20 transition-colors">
                  <Mic className="text-vox-secondary" size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-3">True-to-Life Cloning</h3>
                <p className="text-vox-text-dim text-sm leading-relaxed">
                  Provide just a 3-second audio sample to clone any voice, perfectly mimicking timbre and emotion.
                </p>
              </GlassCard>

              <GlassCard interactive className="group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                  <Globe2 className="text-emerald-500" size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-3">Multilingual Roots</h3>
                <p className="text-vox-text-dim text-sm leading-relaxed">
                  Flawlessly synthesize speech in multiple languages with authentic accents and perfect pronunciation.
                </p>
              </GlassCard>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
