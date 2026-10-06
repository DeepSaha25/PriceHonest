import React, { useEffect, useRef, useState } from 'react';
import '@designcodeio/threeui/style.css';

export interface TopDockOptions {
  proximity?: number;
  spring?: number;
  damping?: number;
  widthGrowth?: number;
  heightGrowth?: number;
  drop?: number;
  axis?: 'x' | 'y';
  distribute?: boolean;
  lockTrack?: boolean;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/**
 * High-performance spring controller for TopDock items.
 * Matches ThreeUI topDockController physics byte-for-byte.
 */
function createTopDockController(root: HTMLElement, getOptions: () => TopDockOptions) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-dock-item]')).map((el) => ({
    element: el,
    baseWidth: 0,
    baseHeight: 0,
    value: 0,
    velocity: 0,
    target: 0,
  }));
  let active = false;
  let tracking = false;
  let animating = false;
  let rafId = 0;

  const canAnimate = () =>
    !reduceMotion.matches && root.clientWidth > 0 && window.innerWidth > 768 && finePointer.matches;

  const reset = () => {
    active = canAnimate();
    if (getOptions().lockTrack) root.style.width = '';
    for (const item of items) {
      item.element.style.width = '';
      item.element.style.height = '';
      item.element.style.transform = '';
      item.element.dataset.dockNear = 'false';
    }
    for (const item of items) {
      const rect = item.element.getBoundingClientRect();
      item.baseWidth = rect.width;
      item.baseHeight = rect.height;
      item.value = 0;
      item.velocity = 0;
      item.target = 0;
    }
    tracking = false;
    animating = false;
    if (getOptions().lockTrack) {
      root.style.width = `${root.getBoundingClientRect().width.toFixed(2)}px`;
    }
    root.dataset.dockState = active ? 'idle' : 'static';
    root.dataset.dockMax = '0.00';
  };

  const updateTargets = (clientX: number, clientY: number) => {
    if (!active) return;
    const opts = getOptions();
    const isY = opts.axis === 'y';
    const pos = isY ? clientY : clientX;
    const rects = items.map((i) => i.element.getBoundingClientRect());
    for (let i = 0; i < items.length; i++) {
      const r = rects[i];
      const center = isY ? r.top + r.height * 0.5 : r.left + r.width * 0.5;
      const proximityFactor = clamp(1 - Math.abs(pos - center) / Math.max(1, opts.proximity ?? 100), 0, 1);
      const eased = proximityFactor * proximityFactor * (3 - 2 * proximityFactor);
      items[i].target = eased;
      items[i].element.dataset.dockNear = eased > 0.08 ? 'true' : 'false';
    }
    tracking = true;
    animating = true;
    root.dataset.dockState = 'active';
  };

  const setFocusTarget = (targetEl: HTMLElement) => {
    if (!active) return;
    const idx = items.findIndex((i) => i.element === targetEl);
    if (idx < 0) return;
    items.forEach((item, i) => {
      item.target = i === idx ? 1 : Math.abs(i - idx) === 1 ? 0.24 : 0;
      item.element.dataset.dockNear = item.target > 0.08 ? 'true' : 'false';
    });
    tracking = false;
    animating = true;
    root.dataset.dockState = 'focus';
  };

  const clearTargets = () => {
    tracking = false;
    for (const item of items) {
      item.target = 0;
      item.element.dataset.dockNear = 'false';
    }
    if (!animating) root.dataset.dockState = 'idle';
  };

  const stepSpring = () => {
    if (!active) {
      animating = false;
      return;
    }
    const opts = getOptions();
    const spring = opts.spring ?? 0.19;
    const damping = opts.damping ?? 0.70;
    const widthGrowth = opts.widthGrowth ?? 10;
    const heightGrowth = opts.heightGrowth ?? 2;
    const drop = opts.drop ?? 1;
    const isY = opts.axis === 'y';

    let maxVal = 0;
    let moving = false;

    for (const item of items) {
      const force = (item.target - item.value) * spring;
      item.velocity = (item.velocity + force) * damping;
      item.value += item.velocity;

      if (Math.abs(item.velocity) > 0.0005 || Math.abs(item.target - item.value) > 0.0005) {
        moving = true;
      } else {
        item.value = item.target;
        item.velocity = 0;
      }

      maxVal = Math.max(maxVal, item.value);

      if (item.baseWidth > 0) {
        const w = item.baseWidth + item.value * widthGrowth;
        const h = item.baseHeight + item.value * heightGrowth;
        item.element.style.width = `${w.toFixed(2)}px`;
        item.element.style.height = `${h.toFixed(2)}px`;
      }

      const shift = (item.value * drop).toFixed(2);
      item.element.style.transform = isY
        ? `translate3d(${shift}px, 0, 0)`
        : `translate3d(0, ${shift}px, 0)`;
    }

    root.dataset.dockMax = maxVal.toFixed(2);

    if (moving || tracking) {
      rafId = requestAnimationFrame(stepSpring);
    } else {
      animating = false;
      rafId = 0;
      root.dataset.dockState = maxVal > 0.01 ? 'settled' : 'idle';
    }
  };

  const startLoop = () => {
    if (!animating) {
      animating = true;
      rafId = requestAnimationFrame(stepSpring);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    updateTargets(e.clientX, e.clientY);
    startLoop();
  };

  const onPointerLeave = () => {
    clearTargets();
    startLoop();
  };

  const onFocusIn = (e: FocusEvent) => {
    if (e.target instanceof HTMLElement && e.target.hasAttribute('data-dock-item')) {
      setFocusTarget(e.target);
      startLoop();
    }
  };

  const onFocusOut = () => {
    clearTargets();
    startLoop();
  };

  const onResize = () => reset();

  root.addEventListener('pointermove', onPointerMove, { passive: true });
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  window.addEventListener('resize', onResize);

  reset();

  return () => {
    cancelAnimationFrame(rafId);
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerleave', onPointerLeave);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    window.removeEventListener('resize', onResize);
  };
}

export interface AnimatedTopDockNavbarProps {
  onCTA?: () => void;
  proximity?: number;
  spring?: number;
  damping?: number;
  widthGrowth?: number;
  heightGrowth?: number;
  drop?: number;
  className?: string;
}

type NavDockItem = {
  id: string;
  label: string;
  targetId: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: readonly NavDockItem[] = [
  {
    id: 'why',
    label: 'Why?',
    targetId: 'why-section',
    icon: (
      <>
        <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
        <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
        <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
        <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
      </>
    ),
  },
  {
    id: 'how',
    label: 'How it works',
    targetId: 'how-section',
    icon: (
      <>
        <circle cx="3.5" cy="8" r="1.5" />
        <circle cx="12.5" cy="4" r="1.5" />
        <circle cx="12.5" cy="12" r="1.5" />
        <path d="M4.8 7.3 11 4.7M4.8 8.7l6.2 2.6" />
      </>
    ),
  },
  {
    id: 'showcase',
    label: 'Showcase',
    targetId: 'showcase-section',
    icon: (
      <>
        <rect x="2" y="3" width="12" height="10" rx="1.5" />
        <path d="M2 6.5h12M5 4.5h.01M7 4.5h.01" />
      </>
    ),
  },
  {
    id: 'trust',
    label: 'Data sources',
    targetId: 'trust',
    icon: (
      <>
        <circle cx="6.5" cy="6.5" r="3.5" />
        <path d="m9 9 4.5 4.5" />
      </>
    ),
  },
];

export function AnimatedTopDockNavbar({
  onCTA,
  proximity = 110,
  spring = 0.19,
  damping = 0.70,
  widthGrowth = 10,
  heightGrowth = 2,
  drop = 1,
  className = '',
}: AnimatedTopDockNavbarProps) {
  const rootRef = useRef<HTMLElement>(null);
  const optionsRef = useRef<TopDockOptions>({
    proximity,
    spring,
    damping,
    widthGrowth,
    heightGrowth,
    drop,
  });

  optionsRef.current = { proximity, spring, damping, widthGrowth, heightGrowth, drop };

  const [active, setActive] = useState<string>('why');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    return createTopDockController(root, () => optionsRef.current);
  }, []);

  // Update active section & background depth on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const sections = ['why-section', 'how-section', 'showcase-section', 'trust'];
      const scrollPos = window.scrollY + 220;

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.offsetTop <= scrollPos) {
          const map: Record<string, string> = {
            'why-section': 'why',
            'how-section': 'how',
            'showcase-section': 'showcase',
            'trust': 'trust',
          };
          setActive(map[sections[i]]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleClick = (item: NavDockItem) => {
    setActive(item.id);
    setMobileMenuOpen(false);
    const el = document.getElementById(item.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none p-3.5 sm:p-4 md:p-5 ${className}`}>
      <style>{`
        /* Master floating glass bar */
         .atd-navbar-shell {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
           max-width: 1080px;
           height: 58px;
           padding: 0 8px 0 14px;
           border-radius: 9999px;
           background: linear-gradient(115deg, rgba(18, 18, 21, 0.9), rgba(8, 8, 11, 0.84));
           border: 1px solid rgba(255, 255, 255, 0.14);
           box-shadow: 0 24px 58px -14px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.16), inset 0 -1px 0 rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          pointer-events: auto;
          transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
        }

         .atd-navbar-shell:hover {
           border-color: rgba(255, 255, 255, 0.18);
           box-shadow: 0 24px 54px -12px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.2);
         }

         .atd-navbar-shell[data-scrolled="true"] {
           background: rgba(7, 7, 10, 0.94);
           border-color: rgba(255, 255, 255, 0.18);
           box-shadow: 0 24px 64px -16px rgba(0, 0, 0, 0.94), inset 0 1px 0 rgba(255, 255, 255, 0.18);
         }

        /* Ambient subtle aura behind navbar */
        .atd-navbar-glow {
          position: absolute;
          inset: -4px 10%;
          border-radius: 9999px;
          background: radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.18), rgba(255, 255, 255, 0.04) 40%, transparent 70%);
          filter: blur(14px);
          pointer-events: none;
          z-index: -1;
          opacity: 0.75;
          transition: opacity 0.3s ease;
        }

        /* Center navigation dock */
         .atd-dock-track {
           display: flex;
           align-items: center;
           gap: 3px;
           height: 40px;
           padding: 0 2px 0 12px;
           border-left: 1px solid rgba(255, 255, 255, 0.1);
         }

        /* Individual dock items */
        .atd-dock-item {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6.5px;
           height: 36px;
           padding: 0 12px;
          border-radius: 9999px;
          border: 1px solid transparent;
          outline: none;
           color: #a7a7af;
          background: transparent;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: -0.015em;
          white-space: nowrap;
          transform-origin: 50% 50%;
          cursor: pointer;
          transition: color 0.16s ease, background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
          will-change: width, height, transform;
          user-select: none;
        }

        .atd-dock-item:hover,
        .atd-dock-item[data-dock-near="true"] {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.08);
        }

        /* Active dock item: Crisp elevated white pill with dark text */
         .atd-dock-item[aria-pressed="true"] {
           color: #fef3c7 !important;
           background: rgba(245, 158, 11, 0.14) !important;
           border-color: rgba(245, 158, 11, 0.34) !important;
           font-weight: 600 !important;
           box-shadow: inset 0 1px 0 rgba(253, 230, 138, 0.14), 0 4px 16px -5px rgba(245, 158, 11, 0.5) !important;
         }

         .atd-dock-item[aria-pressed="true"]::after {
           content: '';
           position: absolute;
           right: 8px;
           top: 7px;
           width: 4px;
           height: 4px;
           border-radius: 9999px;
           background: #fbbf24;
           box-shadow: 0 0 8px rgba(251, 191, 36, 0.8);
         }

        /* Icons */
        .atd-dock-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          opacity: 0.6;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .atd-dock-icon svg {
          display: block;
          width: 100%;
          height: 100%;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .atd-dock-item:hover .atd-dock-icon,
        .atd-dock-item[data-dock-near="true"] .atd-dock-icon {
          opacity: 0.95;
        }

         .atd-dock-item[aria-pressed="true"] .atd-dock-icon {
           opacity: 1 !important;
           stroke: #fbbf24 !important;
         }

        /* Right CTA: Metallic Amber Jewel Pill */
        .atd-cta-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 38px;
          padding: 0 16px 0 14px;
          border-radius: 9999px;
          font-family: inherit;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #050505;
          background: linear-gradient(180deg, #fcd34d 0%, #f59e0b 55%, #d97706 100%);
          border: 1px solid rgba(253, 230, 138, 0.65);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 6px 20px -3px rgba(245, 158, 11, 0.45);
          cursor: pointer;
          white-space: nowrap;
          transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.18s ease, filter 0.18s ease;
          overflow: hidden;
        }

        .atd-cta-button:hover {
          transform: translateY(-1px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 10px 26px -3px rgba(245, 158, 11, 0.6);
          filter: brightness(1.05);
        }

        .atd-cta-button:active {
          transform: translateY(0.5px) scale(0.98);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 4px 12px -2px rgba(245, 158, 11, 0.4);
        }

         @media (max-width: 820px) {
          .atd-dock-track {
            display: none !important;
          }
           .atd-navbar-shell {
             height: 52px;
             padding: 0 6px 0 12px;
           }
         }

         @media (max-width: 420px) {
           .atd-cta-button {
             padding-left: 11px;
             padding-right: 11px;
             gap: 5px;
             font-size: 10px;
           }
           .atd-cta-button svg {
             display: none;
           }
         }
       `}</style>

      {/* Outer Shell */}
       <div className="atd-navbar-shell" data-scrolled={scrolled}>
        <div className="atd-navbar-glow" aria-hidden="true" />

        {/* ─── 1. Left-most: Brand Mark & Wordmark ─── */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 group cursor-pointer select-none"
          aria-label="PriceHonest home"
        >
          {/* Logo Mark */}
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-neutral-900 p-0.5 shadow-[0_0_14px_rgba(245,158,11,0.25)] transition-all duration-300 group-hover:border-amber-400 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <svg viewBox="0 0 24 24" className="w-full h-full" fill="none">
              <rect width="24" height="24" rx="4.5" fill="#f59e0b" />
              <path d="M6 6h7a3 3 0 0 1 0 6H6V6Z" fill="#000" />
              <path d="M6 12h5v6H6v-6Z" fill="#000" />
              <path d="M14 12h4v6h-4v-6Z" fill="#fff" />
            </svg>
          </div>

          {/* Wordmark */}
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            <span className="font-semibold text-base leading-none tracking-tight text-white transition-colors group-hover:text-neutral-100">
              Price<span className="text-amber-400">Honest</span>
            </span>
            <span className="hidden text-[8px] font-mono uppercase leading-none tracking-[0.16em] text-neutral-500 lg:block">
              Live deal intelligence
            </span>
          </div>
        </a>

        {/* ─── 2. Center: Dedicated Animated Top Dock ─── */}
        <nav
          ref={rootRef}
          className="atd-dock-track hidden md:flex"
          aria-label="Primary navigation"
          data-dock-state="idle"
          data-dock-max="0.00"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className="atd-dock-item"
              data-dock-item
              type="button"
              aria-pressed={active === item.id}
              onClick={() => handleClick(item)}
            >
              <span className="atd-dock-icon" aria-hidden="true">
                <svg viewBox="0 0 16 16">{item.icon}</svg>
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* ─── 3. Right-most: CHECK DEAL CTA & Mobile Hamburger ─── */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCTA}
            className="atd-cta-button group"
            id="nav-check-deal-btn"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-neutral-950 fill-none stroke-[2.2] transition-transform duration-200 group-hover:scale-110" aria-hidden="true">
              <path d="M8 2.5 13.5 5.5v5L8 13.5 2.5 10.5v-5z" />
              <path d="m5.5 8 2 2 3.5-4" strokeWidth="1.8" />
            </svg>
            <span>CHECK DEAL</span>
          </button>

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-neutral-900/90 border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
          >
            {mobileMenuOpen ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
                <line x1="4" x2="20" y1="7" y2="7" />
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="17" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ─── Mobile Drawer Dropdown ─── */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-drawer" className="md:hidden absolute top-[68px] inset-x-4 max-w-sm mx-auto p-3 rounded-2xl bg-neutral-950/95 border border-white/15 backdrop-blur-2xl shadow-2xl pointer-events-auto flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
               type="button"
               onClick={() => handleClick(item)}
               aria-current={active === item.id ? 'page' : undefined}
               className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                 active === item.id
                   ? 'text-amber-100 bg-amber-400/15 border border-amber-300/25 font-semibold shadow-[0_4px_18px_-6px_rgba(245,158,11,0.5)]'
                   : 'text-neutral-300 hover:text-white hover:bg-white/5'
               }`}
            >
              <span className="w-4 h-4 opacity-80">
                <svg viewBox="0 0 16 16" className="w-full h-full stroke-current fill-none stroke-[1.6]">
                  {item.icon}
                </svg>
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

export default AnimatedTopDockNavbar;
