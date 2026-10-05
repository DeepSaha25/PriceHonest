"use client"

import {   
  HeroCarousel,
  type HeroCarouselItem,
} from "@/components/ui/hero-carousel";

const LOOKS: HeroCarouselItem[] = [
  {
    title: "Flagship\nSmartphones",
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80",
    credit: "LIVE CROSS-SCAN",
    meta: ["AMAZON", "FLIPKART", "CROMA"],
    accent: "#f59e0b",
  },
  {
    title: "Studio\nHeadphones",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    credit: "HISTORICAL LOWS",
    meta: ["RELIANCE", "VIJAY SALES", "AMAZON"],
    accent: "#ef4444",
  },
  {
    title: "Pro\nLaptops",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
    credit: "DISCOUNT VERIFICATION",
    meta: ["FLIPKART", "AMAZON", "CROMA"],
    accent: "#3b82f6",
  },
  {
    title: "Sneakers &\nFootwear",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    credit: "REAL-TIME PRICING",
    meta: ["MYNTRA", "AJIO", "FLIPKART"],
    accent: "#e11d48",
  },
  {
    title: "Luxury\nTimepieces",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
    credit: "MRP TAMPER DETECTION",
    meta: ["TATA CLiQ", "AMAZON", "ETHOS"],
    accent: "#d97706",
  },
  {
    title: "Next-Gen\nConsoles",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80",
    credit: "STOCK & PRICE TRACKER",
    meta: ["AMAZON", "FLIPKART", "SHOPATSC"],
    accent: "#8b5cf6",
  },
  {
    title: "Mirrorless\nCameras",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
    credit: "CROSS-RETAILER AUDIT",
    meta: ["AMAZON", "CROMA", "RELIANCE"],
    accent: "#06b6d4",
  },
  {
    title: "Smart\nWearables",
    image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1200&q=80",
    credit: "INSTANT VERDICT",
    meta: ["FLIPKART", "AMAZON", "CROMA"],
    accent: "#10b981",
  },
]

export { LOOKS };

// ONLY DEFAULT EXPORT WILL BE TREATED AS A DEMO
export default function DemoOne() {
  return (
    <HeroCarousel
      items={LOOKS}
      defaultIndex={0}
      brand="PRICEHONEST SHOWCASE"
      autoplay={true}
      autoplayDelay={5000}
    />
  )
}
