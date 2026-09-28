import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { ANALYSIS_VERSION } from "../config";
import { getObservations, recordObservation } from "../db/observationStore";
import { collectEvidence } from "../services/evidenceService";
import { generateRationale } from "../services/llmClient";
import {
  extractDate,
  extractPriceFromText,
  filterAndMatchListings,
  assessListing,
  validateClaims,
  validateProductQuery,
} from "../services/validation";
import { computeVerdict } from "../services/verdictEngine";
import {
  CheckDealResult,
  DealMode,
  DealRequest,
  EvidenceItem,
  ProgressEvent,
  SellerPrice,
  SourceEvidence,
  SourceStatusInfo,
} from "../types";

const router = Router();

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function sourceStatuses(evidence: SourceEvidence): SourceStatusInfo[] {
  return [
    {
      id: "shopping",
      label: "Google Shopping",
      status: evidence.shopping.status,
      count: evidence.shopping.items.length,
    },
    {
      id: "retailers",
      label: "Indian retailer search",
      status: evidence.retailers.status,
      count: evidence.retailers.items.length,
    },
    {
      id: "context",
      label: "Dated price context",
      status: evidence.context.status,
      count: evidence.context.items.length,
    },
  ];
}

function sellerEvidence(
  sellers: SellerPrice[],
  evidence: SourceEvidence,
): EvidenceItem[] {
  const snippets = new Map<string, string>();
  for (const item of [
    ...evidence.shopping.items,
    ...evidence.retailers.items,
  ]) {
    if (item.snippet) snippets.set(item.link, item.snippet);
  }
  return sellers.map((seller) => ({
    title: seller.title,
    url: seller.link,
    source: `${seller.name} (${seller.origin}${evidence.mode === "demo" ? ", demo" : ""})`,
    snippet:
      snippets.get(seller.link) ||
      `${seller.title} — listed at ₹${Math.round(seller.price).toLocaleString("en-IN")}.`,
    mentionedPrice: seller.price,
  }));
}

function buildContextEvidence(evidence: SourceEvidence, productQuery: string): {
  historical: Array<{
    source: string;
    mentionedPrice: number;
    date: string;
    url: string;
  }>;
  evidence: EvidenceItem[];
} {
  const historical: Array<{
    source: string;
    mentionedPrice: number;
    date: string;
    url: string;
  }> = [];
  const contextEvidence: EvidenceItem[] = [];
  for (const item of evidence.context.items) {
    if (!assessListing(productQuery, item.title).accepted) continue;
    const date = extractDate(item.date ?? "") || extractDate(item.snippet);
    const mentionedPrice = extractPriceFromText(item.snippet);
    contextEvidence.push({
      title: item.title,
      url: item.link,
      source:
        evidence.mode === "demo" ? "Dated context (demo)" : "Dated context",
      snippet: item.snippet,
      ...(date ? { date } : {}),
      ...(mentionedPrice !== null ? { mentionedPrice } : {}),
    });
    // A context mention without an actual date is not a historical signal.
    if (date && mentionedPrice !== null) {
      historical.push({
        source: sourceFromLink(item.link),
        mentionedPrice,
        date,
        url: item.link,
      });
    }
  }
  return { historical, evidence: contextEvidence };
}

function sourceFromLink(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./i, "");
  } catch {
    return "context source";
  }
}

function providerWarnings(evidence: SourceEvidence): string[] {
  return [
    evidence.shopping.warning,
    evidence.retailers.warning,
    evidence.context.warning,
    ...(evidence.shopping.warnings ?? []),
    ...(evidence.retailers.warnings ?? []),
    ...(evidence.context.warnings ?? []),
  ].filter((value): value is string => Boolean(value));
}

export async function createCheckDealResult(
  request: DealRequest,
  evidence: SourceEvidence,
  fromCache: boolean,
): Promise<CheckDealResult> {
  const shopping = evidence.shopping.items.map((item) => ({
    ...item,
    origin: "shopping" as const,
  }));
  const retailers = evidence.retailers.items.map((item) => ({
    ...item,
    origin: "retailer" as const,
  }));
  const matched = filterAndMatchListings(request.productQuery, [
    ...shopping,
    ...retailers,
  ]);
  const comparisonQuery = matched.comparison.variants.length === 1 ? matched.comparison.variants[0].query : request.productQuery;
  const context = matched.comparison.status === "needs_selection" ? { historical: [], evidence: [] } : buildContextEvidence(evidence, comparisonQuery);
  const verdict = computeVerdict({
    claimedPrice: request.claimedPrice,
    claimedOriginalPrice: request.claimedOriginalPrice,
    sellerPrices: matched.sellers,
    historicalMentions: context.historical,
  });
  const warnings = providerWarnings(evidence);
  warnings.push(...matched.warnings);
  if (matched.sellers.some((seller) => seller.priceSource === "search_index")) warnings.push("Some prices come from Google's retailer search index because the product page could not be verified. These can lag behind checkout prices; each listing shows its price source.");
  if (matched.sellers.length) warnings.push("Prices exclude conditional bank, exchange and membership offers. Delivery costs and stock at your PIN code must be checked at checkout.");
  if (request.mode === "demo")
    warnings.push(
      "Demo mode is active: fixture listings and dated context are labelled and are not live observations.",
    );
  const excludedCount =
    matched.excludedCount +
    (evidence.shopping.excludedCount ?? 0) +
    (evidence.retailers.excludedCount ?? 0) +
    (evidence.context.excludedCount ?? 0);
  if (excludedCount)
    warnings.push(
      `${excludedCount} listing${excludedCount === 1 ? "" : "s"} excluded by model, variant, accessory, condition, currency, or relevance checks.`,
    );
  if (!matched.sellers.length && matched.comparison.status !== "needs_selection")
    warnings.push(
      "No relevant INR seller evidence was found; no price comparison was invented.",
    );
  if (!context.historical.length && evidence.context.status !== "error")
    warnings.push(
      "No dated price context with both an INR amount and a date was found.",
    );

  const checkedAt = new Date().toISOString();
  const observationKey = `${ANALYSIS_VERSION}:${comparisonQuery}`;
  let observations =
    request.mode === "live" ? getObservations(observationKey) : [];
  if (
    request.mode === "live" &&
    !fromCache &&
    evidence.observedAt &&
    matched.sellers.length
  ) {
    const lowest = matched.sellers[0].price;
    const snapshot = {
      checkedAt: evidence.observedAt,
      lowestPrice: lowest,
      medianPrice: verdict.medianPrice ?? lowest,
      sellerCount: matched.sellers.length,
    };
    observations = recordObservation(observationKey, snapshot);
  }
  const rationale = matched.comparison.status === "needs_selection"
    ? "This search matches multiple product configurations. Select one below so that every retailer price refers to the same model and specifications. Prices across different configurations are not a valid deal comparison."
    : await generateRationale({
    verdict: verdict.verdict,
    confidence: verdict.confidence,
    claimedPrice: request.claimedPrice,
    claimedOriginalPrice: request.claimedOriginalPrice,
    cheapestSeller: verdict.cheapestSeller,
    medianPrice: verdict.medianPrice,
    historicalMentions: context.historical,
    productTitle: request.productQuery,
    reasons: [...matched.warnings, ...verdict.reasons],
  });
  const evidenceItems = [
    ...sellerEvidence(matched.sellers, evidence),
    ...context.evidence,
  ].slice(0, 40);
  const image =
    matched.sellers.find((seller) => seller.thumbnail)?.thumbnail ?? null;
  return {
    id: randomUUID(),
    product: {
      title: request.productQuery,
      image,
      claimedPrice: request.claimedPrice ?? null,
      claimedOriginalPrice: request.claimedOriginalPrice ?? null,
    },
    verdict: verdict.verdict,
    confidence: verdict.confidence,
    realDiscountPercent: verdict.realDiscountPercent,
    advertisedDiscountPercent: verdict.advertisedDiscountPercent,
    marketDiscountPercent: verdict.marketDiscountPercent,
    savingsVsCheapest: verdict.savingsVsCheapest,
    sellers: matched.sellers,
    cheapestSeller: verdict.cheapestSeller,
    medianPrice: verdict.medianPrice,
    historicalSignals: context.historical,
    evidence: evidenceItems,
    rationale,
    reasons: [...matched.warnings, ...verdict.reasons],
    warnings: unique(warnings),
    excludedCount,
    sources: sourceStatuses(evidence).map((source) => {
      const count = source.id === "context" ? context.evidence.length : matched.sellers.filter((seller) => seller.origin === (source.id === "shopping" ? "shopping" : "retailer")).length;
      return { ...source, count, status: source.status === "success" && !count ? "empty" : source.status };
    }),
    observations: observations.slice(-20),
    fromCache,
    checkedAt,
    mode: request.mode,
    analysisVersion: ANALYSIS_VERSION,
    comparison: matched.comparison,
    retailers: (evidence.retailers.coverage ?? []).map((store) => {
      const count = matched.sellers.filter((seller) => new URL(seller.link).hostname === store.domain || new URL(seller.link).hostname.endsWith(`.${store.domain}`)).length;
      return { ...store, count, status: count ? "success" : store.status === "error" ? "error" : "empty", ...(count ? { message: "Matching configuration and INR price found." } : matched.comparison.status === "needs_selection" && store.count ? { message: "Matching configurations found; select one to compare." } : {}) };
    }),
    evidenceObservedAt: evidence.observedAt ?? null,
  };
}

function parseRequest(body: unknown): DealRequest {
  if (!body || typeof body !== "object")
    throw new Error("Request body must be a JSON object");
  const value = body as Record<string, unknown>;
  const productQuery = validateProductQuery(value.productQuery);
  const claims = validateClaims(value.claimedPrice, value.claimedOriginalPrice);
  const mode = value.mode === undefined ? "live" : value.mode;
  if (mode !== "live" && mode !== "demo")
    throw new Error("mode must be live or demo");
  if (
    value.forceRefresh !== undefined &&
    typeof value.forceRefresh !== "boolean"
  )
    throw new Error("forceRefresh must be a boolean");
  return {
    productQuery,
    claimedPrice: claims.claimedPrice,
    claimedOriginalPrice: claims.claimedOriginalPrice,
    mode: mode as DealMode,
    forceRefresh: value.forceRefresh === true,
  };
}

function validationErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  if (/productQuery is required|Request body must be/i.test(message))
    return 400;
  return /must be|mode|boolean|provide|resolve/i.test(message) ? 422 : 400;
}

async function execute(
  body: unknown,
  signal?: AbortSignal,
  progress?: (event: ProgressEvent) => void,
): Promise<CheckDealResult> {
  const request = parseRequest(body);
  const collected = await collectEvidence(
    request.productQuery,
    request.mode,
    request.forceRefresh,
    signal,
    (step, status, message) => {
      progress?.({ type: "progress", step, status, message });
    },
  );
  progress?.({
    type: "progress",
    step: "analysis",
    status: "running",
    message: "Applying deterministic evidence and price rules…",
  });
  const result = await createCheckDealResult(
    request,
    collected.evidence,
    collected.fromCache,
  );
  progress?.({
    type: "progress",
    step: "analysis",
    status: "done",
    message: "Analysis complete; verdict uses only retained evidence.",
  });
  return result;
}

router.post("/", async (req: Request, res: Response) => {
  const controller = new AbortController();
  let finished = false;
  const cancel = () => {
    if (!finished) controller.abort();
  };
  req.once("aborted", cancel);
  res.once("close", cancel);
  try {
    const result = await execute(req.body, controller.signal);
    if (res.headersSent && res.writableEnded) return;
    finished = true;
    return res.json(result);
  } catch (error) {
    if (controller.signal.aborted && !res.writableEnded)
      return res.status(499).json({ error: "Request cancelled" });
    const status = validationErrorStatus(error);
    finished = true;
    return res.status(status >= 500 ? 500 : status).json({
      error:
        status === 422
          ? error instanceof Error
            ? error.message
            : "Invalid request"
          : "Unable to check this deal safely.",
    });
  }
});

router.post("/stream", async (req: Request, res: Response) => {
  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  const controller = new AbortController();
  let connected = true;
  let finished = false;
  const write = (payload: unknown): boolean => {
    if (!connected || res.writableEnded || res.destroyed) return false;
    try {
      res.write(`${JSON.stringify(payload)}\n`);
      return true;
    } catch {
      connected = false;
      return false;
    }
  };
  const cancel = () => {
    if (!finished) {
      connected = false;
      controller.abort();
    }
  };
  req.once("aborted", cancel);
  res.once("close", cancel);
  try {
    const result = await execute(req.body, controller.signal, (event) => {
      write(event);
    });
    if (connected) {
      write({ type: "result", data: result });
      finished = true;
      res.end();
    }
  } catch (error) {
    if (connected && !controller.signal.aborted) {
      write({
        type: "error",
        error:
          error instanceof Error && validationErrorStatus(error) === 422
            ? error.message
            : "Unable to check this deal safely.",
      });
      finished = true;
      res.end();
    }
  }
});

export { parseRequest };
export default router;
