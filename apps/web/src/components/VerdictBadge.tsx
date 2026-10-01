import { motion } from "framer-motion";
import type { VerdictType, Confidence } from "../lib/types";
import {
  ShieldCheckIcon,
  AlertTriangleIcon,
  AlertOctagonIcon,
  BarChartIcon,
} from "./Icons";

interface Props {
  verdict: VerdictType;
  confidence: Confidence;
}

const VERDICTS = {
  genuine_deal: {
    Icon: ShieldCheckIcon,
    label: "Genuine Deal",
    sub: "This discount checks out against live market data.",
    bg: "rgba(34, 197, 94, 0.08)",
    border: "rgba(34, 197, 94, 0.35)",
    text: "#22c55e",
    glow: "rgba(34, 197, 94, 0.18)",
  },
  inflated_discount: {
    Icon: AlertTriangleIcon,
    label: "Discount Inflated",
    sub: 'The "original price" looks artificially high.',
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.35)",
    text: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.18)",
  },
  not_actually_cheap: {
    Icon: AlertOctagonIcon,
    label: "Not Actually Cheap",
    sub: "You can find this for less elsewhere right now.",
    bg: "rgba(239, 68, 68, 0.08)",
    border: "rgba(239, 68, 68, 0.35)",
    text: "#ef4444",
    glow: "rgba(239, 68, 68, 0.18)",
  },
  market_overview: {
    Icon: BarChartIcon,
    label: "Market Overview",
    sub: "Add an offer price to get a claim-specific verdict.",
    bg: "rgba(96, 165, 250, 0.08)",
    border: "rgba(96, 165, 250, 0.35)",
    text: "#60a5fa",
    glow: "rgba(96, 165, 250, 0.18)",
  },
  insufficient_data: {
    Icon: AlertTriangleIcon,
    label: "Not Enough Evidence",
    sub: "We will not guess without enough comparable listings.",
    bg: "rgba(161, 161, 170, 0.08)",
    border: "rgba(161, 161, 170, 0.35)",
    text: "#a1a1aa",
    glow: "rgba(161, 161, 170, 0.18)",
  },
};

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence — limited data",
};

export default function VerdictBadge({ verdict, confidence }: Props) {
  const v = VERDICTS[verdict as keyof typeof VERDICTS] ?? VERDICTS.genuine_deal;
  const IconComponent = v.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="flex flex-col items-center text-center py-2"
    >
      <motion.div
        className="relative mb-3 flex items-center justify-center"
        style={{ color: v.text }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-30 pointer-events-none"
          style={{ background: v.text }}
        />
        <IconComponent size={46} className="relative z-10" />
      </motion.div>

      <div
        className="text-3xl font-bold tracking-tight"
        style={{ color: v.text }}
      >
        {v.label}
      </div>

      <div className="text-sm mt-2 max-w-md text-neutral-400">{v.sub}</div>

      {/* Confidence pill */}
      <div
        className="mt-4 px-4 py-1.5 rounded-full text-xs font-medium"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#a3a3a3",
        }}
      >
        {CONFIDENCE_LABELS[confidence]}
      </div>
    </motion.div>
  );
}
