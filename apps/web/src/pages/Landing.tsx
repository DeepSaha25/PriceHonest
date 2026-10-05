import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheckIcon,
  ZapIcon,
  LockIcon,
  BarChartIcon,
  GlobeIcon,
  SparklesIcon,
  TagIcon,
  CalendarIcon,
} from '../components/Icons';
import { useEffectVisibility } from '../lib/useEffectVisibility';
const ProblemShaderCards = lazy(() => import('../components/ProblemShaderCards'));
const HowItWorksBooksShowcase = lazy(() => import('../components/HowItWorksBooksShowcase'));
const BrutalistBentoCharts = lazy(() => import('../components/BrutalistCharts'));
import { HeroCarousel } from '@/components/ui/hero-carousel';
import { LOOKS } from '@/components/ui/demo';
const TurbulentFlow = lazy(() => import('@/components/ui/turbulent-flow'));
import { GetStartedButton } from '../components/GetStartedButton';
import { AnimatedTopDockNavbar } from '../components/AnimatedTopDockNavbar';

function DeferredSection({ children, height, id }: { children: React.ReactNode; height: number; id: string }) {
  const { ref, visited } = useEffectVisibility<HTMLDivElement>('300px');
  return <div ref={ref} id={id} style={{ minHeight: visited ? undefined : height }}>
    {visited && <Suspense fallback={<div style={{ minHeight: height }} />}>{children}</Suspense>}
  </div>;
}



// ─── Hero ─────────────────────────────────────────────────────────────────────
const Hero = React.memo(({ onCTA }: { onCTA: () => void }) => {
  return (
    <section
      className="relative isolate flex flex-col items-center justify-start overflow-hidden px-4 pb-8 pt-28 sm:px-6 sm:pb-12 sm:pt-32 md:pt-36"
      style={{ animation: 'fadeIn 0.6s ease-out' }}
    >
      {/* Dynamic Turbulent Flow WebGL background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-40" aria-hidden="true">
        <Suspense fallback={null}><TurbulentFlow className="w-full h-full" /></Suspense>
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/45 to-black pointer-events-none" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[34rem] bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_62%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" aria-hidden="true" />

      <div className="relative z-10 flex w-full max-w-5xl min-w-0 flex-col items-center text-center">
        <div className="mb-6 flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400 sm:mb-7 sm:text-[11px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-3 py-1.5 text-amber-200/90 shadow-[0_0_24px_rgba(245,158,11,0.08)]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.9)]" />
            Live market signal
          </span>
          <span className="hidden text-neutral-600 sm:inline">/</span>
          <span>India · 8+ retailer signals</span>
        </div>

        {/* Main headline */}
        <h1
          className="mb-5 w-full max-w-5xl px-0 text-[clamp(2.65rem,7.2vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.055em] sm:mb-6 sm:px-4"
        >
          <span className="block bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent">Before you buy it <span className="text-amber-300">—</span></span>
          <span className="mt-2 block bg-gradient-to-r from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-transparent sm:mt-3">know if it's actually a deal.</span>
        </h1>

        {/* Subheadline */}
        <p className="mb-7 w-full max-w-2xl px-2 text-sm font-normal leading-relaxed text-neutral-400 sm:mb-8 sm:px-4 sm:text-base md:text-lg">
          Paste any product link or name. PriceHonest scans live store listings across Amazon, Flipkart &amp; more to give you an evidence-backed discount verdict.
        </p>

        {/* CTA button */}
        <div className="mb-10 flex max-w-full flex-col items-center gap-2.5 sm:mb-12">
          <GetStartedButton
            id="hero-cta-btn"
            label="CHECK DEAL"
            size="lg"
            onClick={onCTA}
          />
          <div className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-mono uppercase tracking-wider text-neutral-400 sm:text-xs">
            <span>Instant</span>
            <span className="text-neutral-600">·</span>
            <span>100% Free</span>
            <span className="text-neutral-600">·</span>
            <span>No Extension Needed</span>
          </div>
        </div>

        <div className="mb-10 grid w-full max-w-3xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-black/25 px-2 py-3 text-left backdrop-blur-sm sm:mb-12 sm:px-5 sm:py-4">
          <div className="px-2 sm:px-4">
            <div className="mb-1 text-[9px] font-mono uppercase tracking-[0.16em] text-neutral-500">01 / Evidence</div>
            <div className="text-[11px] font-medium text-neutral-200 sm:text-xs">Live retailer prices</div>
          </div>
          <div className="px-2 sm:px-4">
            <div className="mb-1 text-[9px] font-mono uppercase tracking-[0.16em] text-neutral-500">02 / Verdict</div>
            <div className="text-[11px] font-medium text-neutral-200 sm:text-xs">Market-backed clarity</div>
          </div>
          <div className="px-2 sm:px-4">
            <div className="mb-1 text-[9px] font-mono uppercase tracking-[0.16em] text-neutral-500">03 / Time</div>
            <div className="text-[11px] font-medium text-neutral-200 sm:text-xs">Under a minute</div>
          </div>
        </div>
      </div>

      {/* Editorial Category Filmstrip Showcase */}
      <div className="relative z-10 w-full max-w-6xl min-w-0 pb-8 sm:pb-16">
        <div className="mb-3 flex items-center justify-between px-1 text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-500 sm:px-2">
          <span><span className="text-amber-400">01</span> / Browse the signal</span>
          <span className="hidden sm:inline">Drag · scroll · compare</span>
        </div>
        <div className="relative h-[390px] w-full overflow-hidden rounded-2xl border border-white/15 bg-neutral-950 shadow-[0_30px_100px_rgba(0,0,0,0.72),0_0_70px_rgba(245,158,11,0.08)] ring-1 ring-black/40 sm:h-[470px] sm:rounded-3xl lg:h-[560px]">
          <div className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] ring-1 ring-inset ring-white/10" aria-hidden="true" />
          <HeroCarousel
            items={LOOKS}
            defaultIndex={0}
            brand="PRICEHONEST · LIVE AUDIT"
            autoplay={true}
            autoplayDelay={4500}
            className="w-full h-full"
          />
        </div>
        <div className="mt-3 flex items-center justify-between px-1 text-[10px] font-mono uppercase tracking-[0.14em] text-neutral-600 sm:px-2">
          <span>Each card is a category, every price is a claim.</span>
          <span className="hidden text-neutral-500 sm:inline">PriceHonest / Live audit</span>
        </div>
      </div>
    </section>
  );
});
Hero.displayName = 'Hero';

// ─── MockupCard — a real rendered preview of the verdict UI ───────────────────
function MockupCard() {
  const sellers = [
    { name: 'BOAT', price: 999, link: '#' },
    { name: 'AMAZON', price: 999, link: '#' },
    { name: 'GADGETS', price: 1099, link: '#' },
    { name: 'SWAPNA I', price: 1230, link: '#' },
    { name: 'ADDMECAR', price: 1249, link: '#' },
    { name: 'NALANDA', price: 1399, link: '#' },
  ];

  return (
    <div
      className="w-full rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-black"
      style={{
        boxShadow: '0 0 80px rgba(245,158,11,0.12), 0 40px 100px rgba(0,0,0,0.8)',
      }}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800" style={{ background: '#0b0b12' }}>
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
        <span className="w-3 h-3 rounded-full bg-green-400/80" />
        <div
          className="ml-4 flex-1 text-xs text-center py-1 px-3 rounded-md"
          style={{
            background: '#1a1a24',
            color: '#71717a',
            maxWidth: 240,
            margin: '0 auto',
          }}
        >
          pricehonest.app/app
        </div>
      </div>

      <div className="p-2 sm:p-4 md:p-5">
        <BrutalistBentoCharts
          sellers={sellers}
          claimedPrice={999}
          claimedOriginalPrice={2850}
          medianPrice={1185}
          verdict="genuine_deal"
          confidence="high"
          realDiscountPercent={16}
          mode="demo"
        />
      </div>
    </div>
  );
}




// ─── Live Deal Audit Verdict Preview ───────────────────────────────────────────
function LiveVerdictPreviewSection({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="relative z-10 px-4 py-14 sm:px-6 sm:py-20" id="showcase">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-widest mb-3 font-semibold text-amber-500">
            Live Deal Audit
          </div>
          <h2
            className="mb-4 text-[clamp(1.875rem,6vw,3rem)] font-medium leading-tight"
            style={{
              background: 'linear-gradient(to bottom, #ffffff, #ffffff, rgba(255, 255, 255, 0.65))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.04em',
            }}
          >
            What an honest verdict looks like.
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-neutral-400 sm:text-base md:text-lg">
            Every product scan returns an instant cross-store price comparison, real discount verification,
            and AI-driven market intelligence.
          </p>
        </div>

        {/* Mockup / dashboard preview with warm ambient glow */}
        <div className="w-full relative pb-4">
          <div
            className="absolute left-1/2 w-[90%] pointer-events-none z-0"
            style={{ top: '-18%', transform: 'translateX(-50%)' }}
            aria-hidden="true"
          >
            <div
              style={{
                width: '100%',
                paddingBottom: '30%',
                background:
                  'radial-gradient(ellipse at center, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.06) 50%, transparent 80%)',
                borderRadius: '50%',
                filter: 'blur(40px)',
              }}
            />
          </div>

          <div className="relative z-10">
            <MockupCard />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer CTA ───────────────────────────────────────────────────────────────
function FooterCTA({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="px-4 py-16 text-center sm:px-6 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto"
      >
        <h2
          className="mb-5 text-[clamp(2rem,7vw,3rem)] font-medium leading-tight"
          style={{
            background: 'linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.6))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.05em',
          }}
        >
          Don't get fooled by fake discounts.
        </h2>
        <p className="text-sm md:text-base mb-10" style={{ color: '#9ca3af' }}>
          Next time you see a 70% off tag — spend 10 seconds here first.
        </p>
        <div className="flex flex-col items-center justify-center">
          <GetStartedButton
            id="footer-cta-btn"
            label="GET STARTED"
            size="lg"
            onClick={onCTA}
          />
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer id="trust" className="border-t border-gray-800/50 px-4 py-8 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm font-semibold text-white">
          Price<span style={{ color: '#f59e0b' }}>Honest</span>
        </div>
        <div className="max-w-xl text-center text-xs leading-relaxed" style={{ color: '#6b7280' }}>
          Built for SerpApi India Hackathon 2026 · Powered by SerpApi live search data
        </div>
        <div className="text-xs" style={{ color: '#6b7280' }}>
          © 2026 PriceHonest
        </div>
      </div>
    </footer>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const goToApp = () => navigate('/app');

  return (
    <main className="min-h-screen bg-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
       {/* Fonts are loaded once in index.html. */}
       <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <AnimatedTopDockNavbar onCTA={goToApp} />
      <Hero onCTA={goToApp} />
      <DeferredSection height={600} id="why-section"><ProblemShaderCards onCTA={goToApp} /></DeferredSection>
      <DeferredSection height={1200} id="how-section"><HowItWorksBooksShowcase onCTA={goToApp} /></DeferredSection>
      <DeferredSection height={1100} id="showcase-section"><LiveVerdictPreviewSection onCTA={goToApp} /></DeferredSection>
      <FooterCTA onCTA={goToApp} />
      <Footer />
    </main>
  );
}
