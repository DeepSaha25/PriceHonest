"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { SellerPrice, VerdictType, Confidence } from "../lib/types";

// =========================================
// TYPES & PROPS
// =========================================
export interface BrutalistChartsProps {
  sellers: SellerPrice[];
  claimedPrice?: number | null;
  claimedOriginalPrice?: number | null;
  medianPrice?: number | null;
  verdict: VerdictType;
  confidence: Confidence;
  realDiscountPercent?: number | null;
  mode?: 'live' | 'demo';
}

const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

// =========================================
// 1. BRUTALIST BAR CHART (STORE PRICES)
// =========================================
interface BarItem {
  label: string;
  fullName: string;
  price: number;
  value: number; // percentage 0-100
  color: string;
  link?: string;
  isCheapest?: boolean;
  isClaimed?: boolean;
}

const COLOR_PALETTE = [
  "bg-yellow-400",
  "bg-blue-400",
  "bg-orange-400",
  "bg-purple-400",
  "bg-pink-400",
  "bg-cyan-400",
];

export const BrutalistBarChart = ({
  sellers,
  claimedPrice,
}: {
  sellers: SellerPrice[];
  claimedPrice?: number | null;
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  // Build clean bar items from sellers + claimed price
  const sorted = [...sellers].sort((a, b) => a.price - b.price);
  const minPrice = sorted[0]?.price ?? (claimedPrice || 1000);

  const rawList: Array<{ name: string; price: number; link?: string; isClaimed?: boolean }> = [];

  if (claimedPrice) {
    rawList.push({ name: "This Deal", price: claimedPrice, isClaimed: true });
  }

  sorted.forEach((s) => {
    // Avoid duplicate "This Deal" if seller has same name
    if (rawList.length < 6) {
      rawList.push({ name: s.name, price: s.price, link: s.link });
    }
  });

  const maxPrice = Math.max(...rawList.map((x) => x.price), 1);
  const spread = Math.max(maxPrice - minPrice, 1);

  const barData: BarItem[] = rawList.map((item, idx) => {
    const isCheapest = item.price === minPrice;
    // Visually meaningful scaling: baseline 32% for cheapest, scaling up to 96% for max price
    const relativeFactor = spread > 0 ? (item.price - minPrice) / spread : 0.5;
    const heightPercent = Math.round(32 + relativeFactor * 64);

    let color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
    if (isCheapest) {
      color = "bg-emerald-400";
    } else if (item.isClaimed) {
      color = "bg-amber-400";
    }

    // Short label for the bar foot
    const shortLabel = item.isClaimed
      ? "DEAL"
      : item.name
          .replace(/ official| store| shopping| electronics/gi, "")
          .trim()
          .slice(0, 8)
          .toUpperCase();

    return {
      label: shortLabel,
      fullName: item.name,
      price: item.price,
      value: heightPercent,
      color,
      link: item.link,
      isCheapest,
      isClaimed: item.isClaimed,
    };
  });

  return (
    <div className="relative flex h-full w-full flex-col border-[3px] border-black bg-white p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-colors duration-200 dark:border-white dark:bg-zinc-900 sm:p-4 dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-1.5 dark:border-white sm:mb-3">
        <h3 className="text-sm font-black uppercase text-black dark:text-white sm:text-base">
          Store Price Comparison
        </h3>
         <span className="border border-black bg-emerald-400 px-1.5 py-0.5 text-[9px] font-bold uppercase text-black dark:border-white sm:text-[10px]">
          Green = Lowest
        </span>
      </div>

      <div className="flex justify-between items-end gap-2 sm:gap-3 h-36 sm:h-44 w-full">
        {barData.map((item, i) => (
          <div key={i} className="relative flex-1 h-full flex items-end group">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${item.value}%` }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 22,
                delay: i * 0.06,
              }}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              className={cn(
                "w-full border-[3px] border-black dark:border-white relative z-10 cursor-pointer origin-bottom flex flex-col items-center justify-between pb-1.5 pt-1 overflow-hidden min-h-[46px]",
                item.color
              )}
              whileHover={{ scaleY: 1.05, scaleX: 1.02 }}
              whileTap={{ scaleY: 0.95 }}
            >
              <div
                className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:4px_4px]"
              />
              <span className="relative z-20 font-black text-[10px] font-mono text-black">
                {fmt(item.price)}
              </span>
              <span className="relative z-20 font-black text-xs font-mono text-black truncate max-w-full px-1">
                {item.label}
              </span>
            </motion.div>

            <AnimatePresence>
              {hovered === i && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full -mb-2 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 text-xs font-black whitespace-nowrap border-[3px] border-black dark:border-white z-30 pointer-events-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] flex flex-col items-center gap-0.5"
                >
                  <span className="uppercase">{item.fullName}</span>
                  <span className="text-sm font-black text-amber-400 dark:text-amber-600">
                    {fmt(item.price)}
                  </span>
                  {item.isCheapest && (
                    <span className="text-[10px] text-emerald-300 dark:text-emerald-700">
                      Lowest matching listing
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 2. BRUTALIST RADAR CHART (DEAL INTEGRITY)
// ==========================================
const NUM_AXES = 5;
const RADAR_SIZE = 220;
const CENTER = RADAR_SIZE / 2;
const RADIUS = 82;

const angleToRad = (angle: number) => (Math.PI / 180) * angle;
const getCoords = (value: number, index: number) => {
  const angle = angleToRad((360 / NUM_AXES) * index - 90);
  const r = (value / 100) * RADIUS;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
};

export const BrutalistRadarChart = ({
  sellers,
}: {
  verdict: VerdictType;
  confidence: Confidence;
  sellers: SellerPrice[];
  claimedPrice?: number | null;
}) => {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  const percent = (condition: (seller: SellerPrice) => boolean) => sellers.length ? Math.round(sellers.filter(condition).length / sellers.length * 100) : 0;
  const radarData = [
    { label: "EXACT MATCH", value: percent((s) => s.match === 'strong'), color: "#4ade80" },
    { label: "PAGE PRICES", value: percent((s) => s.priceSource === 'retailer_page'), color: "#60a5fa" },
    { label: "SHOPPING PRICES", value: percent((s) => s.priceSource === 'google_shopping'), color: "#fbbf24" },
    { label: "INDEXED PRICES", value: percent((s) => s.priceSource === 'search_index'), color: "#f87171" },
    { label: "LISTED IN STOCK", value: percent((s) => s.availability === 'in_stock'), color: "#a78bfa" },
  ];

  const pathData =
    radarData.map((d, i) => {
      const coords = getCoords(d.value, i);
      return `${i === 0 ? "M" : "L"} ${coords.x} ${coords.y}`;
    }).join(" ") + " Z";

  const gridLevels = [100, 75, 50, 25];

  return (
    <div className="relative flex h-full w-full flex-col gap-3 overflow-hidden border-[3px] border-black bg-zinc-900 p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-colors duration-200 dark:border-white sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4 dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
      {/* LEFT: CHART AREA */}
      <div className="flex-1 flex items-center justify-center relative min-h-[170px] sm:min-h-[180px]">
        <svg
          viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
          className="w-full h-full max-w-[190px] sm:max-w-[210px] overflow-visible"
        >
          {/* Grid Background */}
          {gridLevels.map((level, lvlIdx) => (
            <path
              key={lvlIdx}
              d={
                radarData.map((_, i) => {
                  const c = getCoords(level, i);
                  return `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`;
                }).join(" ") + " Z"
              }
              fill="none"
              className="stroke-black/15 dark:stroke-white/15"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          ))}

          {/* Axes Lines */}
          {radarData.map((_, i) => {
            const outer = getCoords(100, i);
            return (
              <line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={outer.x}
                y2={outer.y}
                className="stroke-black/15 dark:stroke-white/15"
                strokeWidth="2"
              />
            );
          })}

          {/* The Data Polygon */}
          <motion.path
            d={pathData}
            fill="rgba(245, 158, 11, 0.35)"
            className="stroke-black dark:stroke-white"
            strokeWidth="3.5"
            strokeLinejoin="round"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: 0.2,
            }}
            style={{ originX: "50%", originY: "50%" }}
          />

          {/* Interactive Points */}
          {radarData.map((d, i) => {
            const coords = getCoords(d.value, i);
            const isHovered = hoveredMetric === d.label;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredMetric(d.label)}
                onMouseLeave={() => setHoveredMetric(null)}
                className="cursor-pointer"
              >
                <circle cx={coords.x} cy={coords.y} r="18" fill="transparent" />
                <motion.circle
                  cx={coords.x}
                  cy={coords.y}
                  r="6"
                  fill={isHovered ? d.color : "currentColor"}
                  className="fill-white dark:fill-zinc-900 stroke-black dark:stroke-white"
                  strokeWidth="3"
                  animate={{
                    scale: isHovered ? 2 : 1,
                    strokeWidth: isHovered ? 4 : 3,
                    fill: isHovered ? d.color : "white",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* RIGHT: STATS LIST */}
      <div className="w-full sm:w-44 flex flex-col justify-center gap-1.5 z-10">
        <h3 className="font-black uppercase text-sm sm:text-base mb-0.5 border-b-2 border-black dark:border-white pb-1 text-black dark:text-white">
          Evidence Coverage
        </h3>
        {radarData.map((item, i) => (
          <motion.div
            key={i}
            onMouseEnter={() => setHoveredMetric(item.label)}
            onMouseLeave={() => setHoveredMetric(null)}
            className="flex items-center justify-between p-1 border border-transparent hover:border-black dark:hover:border-white hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            animate={{
              x: hoveredMetric === item.label ? 4 : 0,
            }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 border border-black dark:border-white shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] font-bold font-mono text-black dark:text-zinc-200 tracking-tight">
                {item.label}
              </span>
            </div>
            <span className="font-black text-xs text-black dark:text-white font-mono">
              {item.value}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// =========================================
// 3. BRUTALIST DONUT CHART (PRICE BREAKDOWN)
// =========================================
const springConfig = { type: "spring", stiffness: 300, damping: 20 };
const getPieCoords = (percent: number) => {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
};

export const BrutalistDonut = ({
  claimedPrice,
  claimedOriginalPrice,
  medianPrice,
  cheapestSeller,
}: {
  claimedPrice?: number | null;
  claimedOriginalPrice?: number | null;
  medianPrice?: number | null;
  cheapestSeller?: SellerPrice | null;
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Compute financial breakdown slices
  const effectivePrice = claimedPrice ?? cheapestSeller?.price ?? 0;
  const benchmarkPrice = medianPrice ?? effectivePrice;
  const costAmount = Math.min(effectivePrice, benchmarkPrice);
  const difference = Math.abs(benchmarkPrice - effectivePrice);
  const totalBase = Math.max(effectivePrice, benchmarkPrice, 1);
  const costPct = costAmount / totalBase * 100;
  const differencePct = difference / totalBase * 100;
  const pieData = [
    { label: claimedPrice ? 'Offer cost' : 'Lowest listing', value: costPct, amount: costAmount, color: "#fbbf24" },
    { label: effectivePrice <= benchmarkPrice ? 'Below median' : 'Above median', value: differencePct, amount: difference, color: effectivePrice <= benchmarkPrice ? "#4ade80" : '#f87171' },
  ].filter((slice) => slice.value > 0);

  let cumulativePercent = 0;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden border-[3px] border-black bg-white p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-colors duration-200 dark:border-white dark:bg-zinc-900 sm:p-4 dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none z-0 bg-[radial-gradient(#000_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:12px_12px]"
      />
      <h3 className="font-black uppercase tracking-tight text-sm sm:text-base border-b-2 border-black dark:border-white pb-1 mb-2 w-full text-center z-10 text-black dark:text-white">
        Price vs Market Median
      </h3>

      <div className="z-10 flex flex-col items-center w-full h-full justify-center">
         <div className="relative h-36 w-36 sm:h-44 sm:w-44">
          <motion.svg
            viewBox="-1.2 -1.2 2.4 2.4"
            className="-rotate-90 overflow-visible w-full h-full"
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: -90, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              delay: 0.2,
            }}
          >
            {pieData.map((slice) => {
              const startPercent = cumulativePercent;
              const endPercent = cumulativePercent + slice.value / 100;
              cumulativePercent = endPercent;
              const [startX, startY] = getPieCoords(startPercent);
              const [endX, endY] = getPieCoords(endPercent);
              const largeArcFlag = slice.value / 100 > 0.5 ? 1 : 0;
              const pathData = slice.value >= 99.999 ? 'M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0 Z' : [
                `M ${startX} ${startY}`,
                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                `L 0 0`,
              ].join(" ");
              const isHovered = hoveredSlice === slice.label;
              const isDimmed = hoveredSlice !== null && !isHovered;

              return (
                <motion.path
                  key={slice.label}
                  d={pathData}
                  fill={slice.color}
                  className="stroke-black dark:stroke-white cursor-pointer"
                  strokeWidth="0.04"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{
                    translateX: isHovered ? (startX + endX) * 0.1 : 0,
                    translateY: isHovered ? (startY + endY) * 0.1 : 0,
                    scale: isHovered ? 1.05 : 1,
                    opacity: isDimmed ? 0.3 : 1,
                    filter: isDimmed ? "grayscale(80%)" : "grayscale(0%)",
                  }}
                  transition={springConfig}
                  onMouseEnter={() => setHoveredSlice(slice.label)}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              );
            })}
            <motion.circle
              cx="0"
              cy="0"
              r="0.55"
              className="fill-white dark:fill-zinc-900 stroke-black dark:stroke-white"
              strokeWidth="0.04"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, ...springConfig }}
            />
          </motion.svg>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <AnimatePresence mode="popLayout">
              {hoveredSlice ? (
                <motion.div
                  key="hover-content"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-xl font-black leading-none text-black dark:text-white font-mono">
                     {Math.round(pieData.find((d) => d.label === hoveredSlice)?.value ?? 0)}%
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-black dark:bg-white text-white dark:text-black px-1.5 py-0.5 mt-1">
                    {hoveredSlice}
                  </span>
                  <span className="text-xs font-bold text-amber-500 dark:text-amber-400 mt-1 font-mono">
                    {fmt(pieData.find((d) => d.label === hoveredSlice)?.amount ?? 0)}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="default-content"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-2xl font-black leading-none text-black dark:text-white font-mono">
                    100%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mt-1">
                    MARKET COMPARISON
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="w-full mt-3 grid grid-cols-2 gap-2">
          {pieData.map((item) => (
            <motion.div
              key={item.label}
              onMouseEnter={() => setHoveredSlice(item.label)}
              onMouseLeave={() => setHoveredSlice(null)}
              animate={{
                opacity: hoveredSlice && hoveredSlice !== item.label ? 0.3 : 1,
                scale: hoveredSlice === item.label ? 1.03 : 1,
              }}
              className="flex items-center gap-1.5 p-1 border border-transparent hover:border-black dark:hover:border-white hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              <div
                className="w-2.5 h-2.5 border border-black dark:border-white shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold uppercase text-black dark:text-white truncate">
                  {item.label}
                </span>
                <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                   {Math.round(item.value)}% ({fmt(item.amount)})
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =========================================
// 4. MAIN BENTO DASHBOARD FOR CHECK DEAL PAGE
// =========================================
export default function BrutalistBentoCharts({
  sellers,
  claimedPrice,
  claimedOriginalPrice,
  medianPrice,
  verdict,
  confidence,
  realDiscountPercent,
  mode = 'live',
}: BrutalistChartsProps) {
  return (
    <div className="w-full relative flex flex-col transition-colors duration-200">
      <header className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            Market Analytics
            <span className="text-[10px] font-mono px-1.5 py-0.5 border-2 border-white bg-amber-400 text-black">
              {mode === 'demo' ? 'DEMO DATA' : 'SOURCED PRICES'}
            </span>
          </h2>
          <p className="font-bold text-neutral-400 uppercase tracking-widest text-[10px] mt-0.5">
            Same-Configuration Retailer Comparison
          </p>
        </div>
      </header>

      {/* MAIN BENTO GRID */}
      <div className="flex flex-col gap-3 sm:gap-4 w-full">
        {/* TOP SECTION: FULL-WIDTH STORE PRICE COMPARISON BAR GRAPH */}
        <div className="w-full min-h-[220px] sm:min-h-[250px]">
          <BrutalistBarChart
            sellers={sellers}
            claimedPrice={claimedPrice}
          />
        </div>

        {/* BOTTOM SECTION: 2 EQUAL COLUMNS (LEFT: RADAR MATRIX, RIGHT: DONUT BREAKDOWN) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
          <div className="w-full min-h-[230px] sm:min-h-[250px] flex">
            <BrutalistRadarChart
              verdict={verdict}
              confidence={confidence}
              sellers={sellers}
              claimedPrice={claimedPrice}
            />
          </div>

          <div className="w-full min-h-[230px] sm:min-h-[250px] flex">
            <BrutalistDonut
              claimedPrice={claimedPrice}
              claimedOriginalPrice={claimedOriginalPrice}
              medianPrice={medianPrice}
              cheapestSeller={sellers[0] ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
