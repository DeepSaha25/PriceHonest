"use client";

import React, { lazy, Suspense, useEffect, useRef } from "react";
import type { PaperShaderElement } from '@paper-design/shaders';
import { useEffectVisibility } from '../lib/useEffectVisibility';
import { startEffectRuntime } from '../lib/effectRuntime';
const Warp = lazy(() => import('@paper-design/shaders-react').then((module) => ({ default: module.Warp })));

function CardShader({ config }: { config: { proportion: number; softness: number; distortion: number; swirl: number; swirlIterations: number; shape: 'checks' | 'stripes'; shapeScale: number; colors: string[] } }) {
  const { ref, visited } = useEffectVisibility<HTMLDivElement>('80px');
  const shaderRef = useRef<PaperShaderElement>(null);
  useEffect(() => {
    if (!visited || !ref.current) return;
    return startEffectRuntime(ref.current, {
      resize: (scale) => shaderRef.current?.paperShaderMount?.setMaxPixelCount(180_000 * scale),
      frame: (elapsed) => shaderRef.current?.paperShaderMount?.setFrame(elapsed * 500),
    });
  }, [visited]);
  return <div ref={ref} className="absolute inset-0 z-0 opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none" style={{ background: `linear-gradient(140deg, ${config.colors[1]}, ${config.colors[3]})` }}>
    {visited && <Suspense fallback={null}><Warp
      ref={shaderRef} style={{ height: '100%', width: '100%', display: 'block' }}
      {...config} swirlIterations={Math.min(config.swirlIterations, 5)}
      scale={1} rotation={0} speed={0}
      minPixelRatio={1} maxPixelCount={180_000}
      webGlContextAttributes={{ antialias: false, powerPreference: 'low-power' }}
    /></Suspense>}
  </div>;
}

interface ProblemFeature {
  title: string;
  description: string;
}

const PROBLEMS: ProblemFeature[] = [
  {
    title: 'Fake "Original" MRPs',
    description:
      "Benchmark MRPs inflated right before sales to simulate artificial 50–70% discounts.",
  },
  {
    title: "Pre-Sale Price Spikes",
    description:
      "Items marked up weeks before festive sales, neutralizing advertised promotional savings.",
  },
  {
    title: "Cheaper Elsewhere",
    description:
      "Identical product SKUs listed for lower prices on rival verified retailers simultaneously.",
  },
  {
    title: "Hidden Checkout Fees",
    description:
      "Unadvertised handling, platform, and packaging fees tacked on right at final payment.",
  },
  {
    title: "Artificial FOMO Timers",
    description:
      "Deceptive countdown clocks and limited-time tags designed to rush unverified checkouts.",
  },
  {
    title: "Silent Variant Swapping",
    description:
      "Headline discounts applied only to base or obsolete specs, not popular configurations.",
  },
];

export default function ProblemShaderCards({ onCTA }: { onCTA?: () => void }) {
  const getShaderConfig = (index: number) => {
    // Soft, luminous, light golden and warm amber palettes so the background is visibly alive
    const configs = [
      {
        proportion: 0.35,
        softness: 1.0,
        distortion: 0.2,
        swirl: 0.7,
        swirlIterations: 8,
        shape: "checks" as const,
        shapeScale: 0.1,
        colors: ["#fef3c7", "#fde68a", "#f59e0b", "#b45309"],
      },
      {
        proportion: 0.38,
        softness: 1.1,
        distortion: 0.22,
        swirl: 0.75,
        swirlIterations: 9,
        shape: "stripes" as const,
        shapeScale: 0.11,
        colors: ["#ffedd5", "#fed7aa", "#f97316", "#c2410c"],
      },
      {
        proportion: 0.36,
        softness: 0.95,
        distortion: 0.18,
        swirl: 0.7,
        swirlIterations: 8,
        shape: "checks" as const,
        shapeScale: 0.09,
        colors: ["#fef9c3", "#fef08a", "#eab308", "#a16207"],
      },
      {
        proportion: 0.4,
        softness: 1.0,
        distortion: 0.21,
        swirl: 0.65,
        swirlIterations: 8,
        shape: "stripes" as const,
        shapeScale: 0.1,
        colors: ["#fff7ed", "#fed7aa", "#fb923c", "#b45309"],
      },
      {
        proportion: 0.34,
        softness: 0.9,
        distortion: 0.19,
        swirl: 0.68,
        swirlIterations: 7,
        shape: "checks" as const,
        shapeScale: 0.09,
        colors: ["#fef3c7", "#fcd34d", "#f59e0b", "#92400e"],
      },
      {
        proportion: 0.37,
        softness: 1.0,
        distortion: 0.2,
        swirl: 0.72,
        swirlIterations: 8,
        shape: "stripes" as const,
        shapeScale: 0.11,
        colors: ["#fef9c3", "#fde047", "#eab308", "#854d0e"],
      },
    ];
    return configs[index % configs.length];
  };

  return (
    <section className="py-16 px-4 sm:px-6 relative z-10" id="why">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-[11px] uppercase tracking-widest mb-2 font-medium text-amber-500">
            Market reality
          </div>
          <h2
            className="text-2xl md:text-3xl font-medium mb-3 tracking-tight"
            style={{
              background: "linear-gradient(to bottom, #ffffff, rgba(255, 255, 255, 0.75))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Indian e-commerce has a discount problem.
          </h2>
          <p className="text-xs md:text-sm max-w-lg mx-auto text-neutral-400 leading-relaxed">
            Most sale tags rely on shoppers not having time to cross-check. PriceHonest scans live store prices instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {PROBLEMS.map((feature, index) => {
            const shaderConfig = getShaderConfig(index);
            return (
              <div
                key={index}
                className="relative rounded-xl overflow-hidden group transition-all duration-300 hover:-translate-y-0.5 border border-white/15 hover:border-amber-400/40 shadow-lg"
              >
                {/* Luminous light background shader — clearly visible and active */}
                <CardShader config={shaderConfig} />

                {/* Frosted translucent glass overlay — lets the light shine through while keeping text 100% crisp */}
                <div className="relative z-10 p-4 sm:p-5 flex flex-col justify-between h-full bg-black/65 hover:bg-black/60 transition-colors">
                  <div>
                    {/* Header: title and monospace index */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-xs sm:text-[13.5px] font-semibold text-white tracking-tight drop-shadow-sm">
                        {feature.title}
                      </h3>
                      <span className="text-[10px] font-mono text-amber-200/80 shrink-0 font-medium">
                        0{index + 1}
                      </span>
                    </div>

                    {/* Description: crisp white/neutral-200, high readability */}
                    <p className="text-[12px] text-neutral-200 leading-relaxed font-normal">
                      {feature.description}
                    </p>
                  </div>

                  {/* Clean minimal footer */}
                  <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-amber-300/90 group-hover:text-amber-200 transition-colors font-medium">
                      Live audit
                    </span>
                    <button
                      type="button"
                      onClick={onCTA}
                      className="text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Verify →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
