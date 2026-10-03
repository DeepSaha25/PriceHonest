import React, { lazy, Suspense, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useEffectVisibility } from '../lib/useEffectVisibility';

const BestsellersBookShowcase = lazy(() => import('@designcodeio/threeui/components/BestsellersBookShowcase').then((module) => ({ default: module.BestsellersBookShowcase })));

interface HowItWorksProps {
  onCTA?: () => void;
}

export function Scene() {
  const { ref, visited, active } = useEffectVisibility<HTMLDivElement>('180px');
  const sync = () => ref.current?.querySelector('iframe')?.contentWindow?.postMessage({ type: 'PRICEHONEST_EFFECT_ACTIVITY', active }, window.location.origin);
  useEffect(sync, [active]);
  return (
    <div ref={ref} onLoad={sync} className="shader-frame relative h-[clamp(22rem,65vw,32rem)] w-full overflow-hidden rounded-2xl border border-amber-500/20 bg-[#090807] shadow-2xl sm:rounded-3xl">
      {visited && <Suspense fallback={<div className="h-full grid place-items-center text-sm text-amber-200/60">Opening the interactive 3D guides…</div>}>
      <BestsellersBookShowcase
        headingFont="iowan-old-style"
        bodyFont="iowan-old-style"
        headingWeight="700"
        bodyWeight="400"
        primaryColor="#f59e0b"
        headingSize={200}
        bodySize={15}
        headingLetterSpacing={-0.03}
      />
      </Suspense>}
    </div>
  );
}

export default function HowItWorksBooksShowcase({ onCTA }: HowItWorksProps) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const frame = document.querySelector<HTMLIFrameElement>('#how iframe');
      if (event.source === frame?.contentWindow && event.origin === window.location.origin && event.data?.type === 'PRICEHONEST_CTA') {
        onCTA?.();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onCTA]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#09090b] via-[#0d0b08] to-[#09090b] px-3 py-10 sm:px-6 md:px-8 md:py-14" id="how">
      {/* Background glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none"
        aria-hidden="true" 
      />

      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-5"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] uppercase tracking-widest font-semibold mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Interactive 3D Pipeline
          </div>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
            Three Steps to the <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">Truth</span>
          </h2>
          <p className="text-xs md:text-sm text-neutral-400 mt-2 max-w-lg mx-auto">
             Click a manual to see how we identify your product, compare retailers, and check the discount.
          </p>
        </motion.div>
        {/* 3D Interactive Bestsellers Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.2, 0.78, 0.2, 1] }}
          className="relative w-full"
        >
          <Scene />
        </motion.div>

        {/* Quick Helper caption below */}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center text-xs text-neutral-500 sm:flex-row sm:gap-6">
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">Click Card</kbd>
            to explore step details
          </span>
          <span className="hidden text-neutral-700 sm:inline">•</span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">Esc / ×</kbd>
            to return to overview
          </span>
        </div>
      </div>
    </section>
  );
}
