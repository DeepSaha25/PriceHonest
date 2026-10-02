import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon } from './Icons';
import './HowItWorksCards.css';

interface Step {
  num: string;
  title: string;
  body: string;
  rotation: number;
  zIndex: number;
  offsetY: number;
}

const STEPS: Step[] = [
  {
    num: '01',
    title: 'Paste a Link or Name',
    body: 'Drop any Amazon, Flipkart, Myntra link — or just type the product name.',
    rotation: -5,
    zIndex: 1,
    offsetY: 20,
  },
  {
    num: '02',
    title: 'We Scan Live Prices',
    body: 'SerpApi pulls real-time prices across all major sellers in seconds.',
    rotation: 0,
    zIndex: 2,
    offsetY: -20,
  },
  {
    num: '03',
    title: 'Get an Honest Verdict',
    body: 'A clear Genuine, Inflated, or Overpriced verdict with evidence and the cheapest deal right now.',
    rotation: 5,
    zIndex: 1,
    offsetY: 20,
  },
];

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const FourPointStar = () => (
  <svg
    className="hiw-card__star"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
  </svg>
);

export default function HowItWorksCards({ onCTA }: { onCTA?: () => void }) {
  return (
    <section className="hiw-section" id="how">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="hiw-header"
        >
          <div className="text-xs uppercase tracking-widest mb-2 font-semibold text-amber-500">
            How it works
          </div>
          <h2 className="hiw-headline">
            Three steps to the truth.
          </h2>
          <p className="text-xs md:text-sm text-neutral-400 mt-3 max-w-lg mx-auto">
            From paste to proof in under 10 seconds. No browser extensions, no signup required.
          </p>
        </motion.div>

        {/* 3D Fanned Cards Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="hiw-cards-container"
        >
          {STEPS.map((step, idx) => (
            <div
              key={step.num}
              className={`hiw-card hiw-card--${idx + 1}`}
              style={{
                transform: `rotate(${step.rotation}deg) translateY(${step.offsetY}px)`,
                zIndex: step.zIndex,
              }}
            >
              {/* Card top: Number with amber sparkle, Title, Description */}
              <div className="hiw-card__top">
                <div className="hiw-card__num-wrapper">
                  <span className="hiw-card__num">{step.num}</span>
                  <FourPointStar />
                </div>
                <h3 className="hiw-card__title">{step.title}</h3>
                <p className="hiw-card__body">{step.body}</p>
              </div>

              {/* Card visual mockup area */}
              <div className="hiw-card__visual">
                <div className="hiw-mockup">
                  {/* Step 01 Visual Mockup: URL / Search Input */}
                  {idx === 0 && (
                    <div className="mockup-window">
                      <div className="mockup-window__icon">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      </div>
                      <div className="mockup-window__text">
                        <span className="mockup-window__title">amazon.in/dp/B09V3HN...</span>
                        <span className="mockup-window__sub">
                          <span className="mockup-window__sub-dot" />
                          Sony WH-1000XM5 detected
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Step 02 Visual Mockup: Live Price Cross-Scan Router */}
                  {idx === 1 && (
                    <div className="mockup-route">
                      <div className="mockup-route__node">
                        <span className="mockup-route__label">AMAZON</span>
                        <span className="mockup-route__value">₹24,999</span>
                      </div>
                      <div className="mockup-route__divider">
                        <div className="mockup-route__line" />
                        <span className="mockup-route__badge">VS</span>
                      </div>
                      <div className="mockup-route__node mockup-route__node--active">
                        <span className="mockup-route__label">FLIPKART · LOW</span>
                        <span className="mockup-route__value">₹23,499</span>
                      </div>
                    </div>
                  )}

                  {/* Step 03 Visual Mockup: Genuine Verdict Badge */}
                  {idx === 2 && (
                    <div className="mockup-verdict-btn">
                      <div className="mockup-verdict-btn__icon">
                        <ShieldCheckIcon size={22} />
                      </div>
                      <div className="mockup-verdict-btn__text">
                        <span className="mockup-verdict-btn__title">Genuine Deal Verified</span>
                        <span className="mockup-verdict-btn__sub">₹23,499 · Save ₹1,500</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Bottom CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-6"
        >
          <button
            id="how-it-works-cta"
            type="button"
            onClick={onCTA}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-8 py-3.5 text-sm md:text-base font-medium cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{
              background: 'linear-gradient(to bottom, #ffffff, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.65))',
              color: '#000000',
              boxShadow: '0 10px 30px -5px rgba(245, 158, 11, 0.25)',
            }}
          >
            Try It Now — Free
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
