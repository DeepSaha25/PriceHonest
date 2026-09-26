import {
  Confidence,
  HistoricalSignal,
  SellerPrice,
  VerdictType,
} from "../types";

export interface RationaleParams {
  verdict: VerdictType;
  confidence: Confidence;
  claimedPrice?: number;
  claimedOriginalPrice?: number;
  cheapestSeller: SellerPrice | null;
  medianPrice: number | null;
  historicalMentions: HistoricalSignal[];
  productTitle: string;
  reasons?: string[];
}

const formatPrice = (value: number) =>
  `₹${Math.round(value).toLocaleString("en-IN")}`;

/**
 * Rationale is deliberately deterministic. An LLM may be added behind an
 * explicit feature flag later, but it must never be able to introduce a seller,
 * price, date, or verdict that is absent from the evidence object.
 */
export async function generateRationale(
  params: RationaleParams,
): Promise<string> {
  const {
    verdict,
    claimedPrice,
    claimedOriginalPrice,
    cheapestSeller,
    medianPrice,
    historicalMentions,
  } = params;
  if (verdict === "market_overview") {
    return medianPrice
      ? `This is a market overview because no claimed offer price was supplied. The median of the relevant seller listings is ${formatPrice(medianPrice)}.`
      : "This is a market overview because no claimed offer price was supplied, but no relevant INR listings were available.";
  }
  if (verdict === "insufficient_data") {
    return `There is not enough relevant INR seller evidence to make a reliable deal call${claimedPrice ? ` for ${formatPrice(claimedPrice)}` : ""}. Treat this report as incomplete rather than as proof that the offer is good or bad.`;
  }
  if (verdict === "genuine_deal") {
    if (cheapestSeller && claimedPrice !== undefined) {
      return claimedPrice <= cheapestSeller.price * 1.02
        ? `At ${formatPrice(claimedPrice)}, the offer is at or near the lowest same-configuration listing: ${cheapestSeller.name} at ${formatPrice(cheapestSeller.price)}.`
        : `At ${formatPrice(claimedPrice)}, the offer is competitive against the same-configuration market median of ${formatPrice(medianPrice!)}. A lower listing was found at ${cheapestSeller.name} for ${formatPrice(cheapestSeller.price)}.`;
    }
    return `The available seller evidence places this offer around the current market range${medianPrice ? `, whose median is ${formatPrice(medianPrice)}` : ""}.`;
  }
  if (verdict === "inflated_discount") {
    const context = historicalMentions[0];
    return `The advertised reference price of ${claimedOriginalPrice ? formatPrice(claimedOriginalPrice) : "the stated original price"} makes the discount look larger than the current market evidence supports. ${context ? `${context.source} mentioned ${formatPrice(context.mentionedPrice)} on ${context.date}, which is useful context but not a continuous price history.` : "Compare the current seller prices rather than relying on the reference price."}`;
  }
  return `The claimed price of ${claimedPrice ? formatPrice(claimedPrice) : "this offer"} is not among the cheapest relevant listings. ${cheapestSeller ? `${cheapestSeller.name} is currently listed at ${formatPrice(cheapestSeller.price)}.` : "More seller evidence is needed."}`;
}
