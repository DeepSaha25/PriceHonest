import {
  Confidence,
  HistoricalSignal,
  SellerPrice,
  VerdictType,
} from "../types";

export interface VerdictInput {
  claimedPrice?: number;
  claimedOriginalPrice?: number;
  sellerPrices: SellerPrice[];
  historicalMentions: HistoricalSignal[];
}

export interface VerdictOutput {
  verdict: VerdictType;
  confidence: Confidence;
  advertisedDiscountPercent: number | null;
  realDiscountPercent: number | null;
  marketDiscountPercent: number | null;
  savingsVsCheapest: number | null;
  priceVsMarket: number | null;
  cheapestSeller: SellerPrice | null;
  medianPrice: number | null;
  reasons: string[];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function median(prices: number[]): number | null {
  const sorted = prices
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function computeVerdict(input: VerdictInput): VerdictOutput {
  const sellers = input.sellerPrices.filter(
    (seller) => Number.isFinite(seller.price) && seller.price > 0,
  );
  const prices = sellers.map((seller) => seller.price);
  const medianPrice = median(prices);
  const cheapestSeller = sellers.length
    ? sellers.reduce((lowest, seller) =>
        seller.price < lowest.price ? seller : lowest,
      )
    : null;
  const claimed = input.claimedPrice;
  const original = input.claimedOriginalPrice;
  const advertisedDiscountPercent =
    claimed !== undefined && original !== undefined && original > claimed
      ? round(((original - claimed) / original) * 100)
      : null;
  const marketDiscountPercent =
    claimed !== undefined && medianPrice && sellers.length >= 2
      ? round(((medianPrice - claimed) / medianPrice) * 100)
      : null;
  const savingsVsCheapest =
    claimed !== undefined && cheapestSeller
      ? Math.max(round(claimed - cheapestSeller.price), 0)
      : null;
  const priceVsMarket =
    claimed !== undefined && medianPrice ? claimed / medianPrice : null;

  const reasons: string[] = [];
  let confidence: Confidence =
    sellers.length >= 4 ? "high" : sellers.length >= 2 ? "medium" : "low";
  if (sellers.some((seller) => seller.match === "possible")) confidence = "low";
  else if (sellers.some((seller) => seller.priceSource === "search_index") && confidence === "high") confidence = "medium";
  let verdict: VerdictType;

  if (sellers.length < 2 || !medianPrice || sellers.filter((seller) => seller.match === "strong").length < 2) {
    verdict = "insufficient_data";
    reasons.push("Fewer than two confidently matched, same-configuration retailer prices were found, so a price comparison would be unreliable.");
    confidence = "low";
  } else if (claimed === undefined) {
    verdict = "market_overview";
    reasons.push(
      "No claimed offer price was supplied, so this report compares the available market listings instead of calling it a deal.",
    );
    if (!sellers.length)
      reasons.push(
        "No relevant INR seller listings were available for comparison.",
      );
  } else {
    const marketSaving = marketDiscountPercent ?? 0;
    const advertised = advertisedDiscountPercent ?? 0;
    const lowerHistoricalPrice = input.historicalMentions.some(
      (mention) =>
        original !== undefined && mention.mentionedPrice < original * 0.85,
    );
    const discountLooksInflated =
      original !== undefined &&
      advertised >= 10 &&
      (advertised - Math.max(marketSaving, 0) >= 15 ||
        original > medianPrice * 1.2 ||
        lowerHistoricalPrice);

    if (discountLooksInflated) {
      verdict = "inflated_discount";
      reasons.push(
        `The advertised discount is ${advertised}% while the claimed price is ${Math.abs(marketSaving)}% ${marketSaving >= 0 ? "below" : "above"} the current seller median.`,
      );
      if (lowerHistoricalPrice)
        reasons.push(
          "A dated context mention is materially below the claimed original price, which makes the reference price less credible.",
        );
    } else if (claimed > medianPrice * 1.1) {
      verdict = "not_actually_cheap";
      reasons.push(
        `The claimed price is ${round(((claimed - medianPrice) / medianPrice) * 100)}% above the current seller median.`,
      );
    } else if (cheapestSeller && claimed <= cheapestSeller.price * 1.02) {
      verdict = "genuine_deal";
      reasons.push(
        `The claimed price is within 2% of the lowest relevant listing, ${cheapestSeller.name} at ₹${Math.round(cheapestSeller.price).toLocaleString("en-IN")}.`,
      );
    } else if (claimed <= medianPrice * 1.02) {
      verdict = "genuine_deal";
      reasons.push(
        `The claimed price is at or below, or within 2% above, the current seller median of ₹${Math.round(medianPrice).toLocaleString("en-IN")}.`,
      );
    } else {
      verdict = "not_actually_cheap";
      reasons.push(
        "The claimed price is not among the competitive current listings, even though it is close to the market median.",
      );
    }
    if (sellers.length === 2) {
      confidence = "medium";
      reasons.push("The comparison uses only two relevant seller listings.");
    }
  }

  if (
    cheapestSeller &&
    claimed !== undefined &&
    claimed > cheapestSeller.price
  ) {
    reasons.push(
      `A cheaper current listing is available from ${cheapestSeller.name} at ₹${Math.round(cheapestSeller.price).toLocaleString("en-IN")}.`,
    );
  }
  return {
    verdict,
    confidence,
    advertisedDiscountPercent,
    realDiscountPercent: marketDiscountPercent,
    marketDiscountPercent,
    savingsVsCheapest,
    priceVsMarket,
    cheapestSeller,
    medianPrice,
    reasons,
  };
}

export type { HistoricalSignal, SellerPrice };
