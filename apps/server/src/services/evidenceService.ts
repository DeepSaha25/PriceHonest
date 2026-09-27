import {
  getEvidence,
  getInFlight,
  normalizeKey,
  setEvidence,
  setInFlight,
} from "../db/cache";
import {
  ProviderBatch,
  SearchResult,
  ShoppingResult,
  SourceEvidence,
} from "../types";
import {
  searchContextDetailed,
  searchMajorRetailersDetailed,
  searchShoppingDetailed,
} from "./serpapiClient";
import { ANALYSIS_VERSION } from "../config";

export type EvidenceStep = "shopping" | "retailers" | "context";
export type EvidenceProgress = (
  step: EvidenceStep,
  status: "running" | "done" | "error",
  message: string,
) => void;

function demoShopping(query: string): ProviderBatch<ShoppingResult> {
  const sony = /sony\s+wh[- ]?1000xm5/i.test(query);
  const title = sony
    ? "Sony WH-1000XM5 Wireless Noise Cancelling Headphones"
    : `${query} — Demo listing`;
  const rows: ShoppingResult[] = sony
    ? [
        {
          title,
          price: 24990,
          source: "Amazon",
          link: "https://www.amazon.in/dp/B09XS7JWHH",
          rating: 4.5,
        },
        {
          title,
          price: 25999,
          source: "Flipkart",
          link: "https://www.flipkart.com/sony-wh-1000xm5/p/itm-demo-xm5",
          rating: 4.4,
        },
        {
          title,
          price: 26990,
          source: "Croma",
          link: "https://www.croma.com/sony-wh-1000xm5/p/261234",
          rating: 4.3,
        },
        {
          title,
          price: 27990,
          source: "Reliance Digital",
          link: "https://www.reliancedigital.in/sony-wh-1000xm5/p/123456",
          rating: 4.2,
        },
        {
          title,
          price: 29990,
          source: "Sony India",
          link: "https://electronics.sony.co.in/wh-1000xm5/p/demo",
          rating: 4.6,
        },
        {
          title: "Sony WH-1000XM5 replacement ear pads",
          price: 1299,
          source: "Accessory Store",
          link: "https://example.com/earpads-xm5",
        },
      ]
    : [
        {
          title,
          price: 3999,
          source: "Amazon",
          link: "https://www.amazon.in/s?k=demo-product",
        },
        {
          title: `${query} Pro Edition — Demo listing`,
          price: 4499,
          source: "Flipkart",
          link: "https://www.flipkart.com/demo-product/p/demo",
        },
        {
          title: `${query} Official — Demo listing`,
          price: 4999,
          source: "Croma",
          link: "https://www.croma.com/demo-product/p/123456",
        },
        {
          title: `${query} premium case`,
          price: 499,
          source: "Accessory Store",
          link: "https://example.com/demo-case",
        },
      ];
  return { items: rows, status: "demo" };
}

function demoRetailers(query: string): ProviderBatch<ShoppingResult> {
  const sony = /sony\s+wh[- ]?1000xm5/i.test(query);
  const title = sony
    ? "Sony WH-1000XM5 Wireless Noise Cancelling Headphones"
    : `${query} — Demo retailer listing`;
  return {
    status: "demo",
    items: sony
      ? [
          {
            title,
            price: 26490,
            source: "Vijay Sales",
            link: "https://www.vijaysales.com/sony-wh-1000xm5/demo",
          },
          {
            title,
            price: 27490,
            source: "Tata CLiQ",
            link: "https://www.tatacliq.com/sony-wh-1000xm5/p-demo",
          },
        ]
      : [
          {
            title,
            price: 4749,
            source: "Reliance Digital",
            link: "https://www.reliancedigital.in/demo-product/p/654321",
          },
        ],
  };
}

function demoContext(query: string): ProviderBatch<SearchResult> {
  const sony = /sony\s+wh[- ]?1000xm5/i.test(query);
  return {
    status: "demo",
    items: sony
      ? [
          {
            title: "Sony WH-1000XM5 price context (demo evidence)",
            link: "https://example.com/demo/sony-wh-1000xm5-price-context",
            snippet:
              "Demo archive mention: Sony WH-1000XM5 was listed at ₹23990 on 2024-10-15 during a sale.",
            date: "2024-10-15",
          },
          {
            title: "Sony WH-1000XM5 launch pricing (demo evidence)",
            link: "https://example.com/demo/sony-wh-1000xm5-launch",
            snippet:
              "Demo editorial mention: launch price was ₹29990 on 2023-01-20.",
            date: "2023-01-20",
          },
        ]
      : [
          {
            title: `${query} price context (demo evidence)`,
            link: "https://example.com/demo/generic-price-context",
            snippet: `Demo archive mention: ${query} was listed at ₹4299 on 2024-08-12.`,
            date: "2024-08-12",
          },
        ],
  };
}

function fixture(query: string): SourceEvidence {
  if (!/sony\s+wh[- ]?1000xm5/i.test(query)) return {
    query, mode: "demo",
    shopping: { items: [], status: "demo", warning: "The offline demo supports Sony WH-1000XM5 only. Use Live mode to search other products." },
    retailers: { items: [], status: "demo" },
    context: { items: [], status: "demo" },
  };
  const shopping = demoShopping(query);
  const retailers = demoRetailers(query);
  for (const item of [...shopping.items, ...retailers.items]) item.priceSource = "demo";
  return {
    query,
    mode: "demo",
    shopping,
    retailers,
    context: demoContext(query),
  };
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const error = new Error("request cancelled");
    error.name = "AbortError";
    throw error;
  }
}

async function collectLive(
  query: string,
  signal?: AbortSignal,
  progress?: EvidenceProgress,
  forceRefresh = false,
): Promise<SourceEvidence> {
  const run = async <T>(
    step: EvidenceStep,
    call: () => Promise<ProviderBatch<T>>,
  ): Promise<ProviderBatch<T>> => {
    throwIfAborted(signal);
    const messages = { shopping: "Finding product offers and resolving retailer links…", retailers: "Searching Amazon, Flipkart, Croma, Reliance Digital, Vijay Sales and other trusted retailers separately…", context: "Checking relevant, dated price mentions…" };
    progress?.(step, "running", messages[step]);
    const result = await call();
    progress?.(
      step,
      result.status === "error" ? "error" : "done",
      result.warning ?? `${step} evidence checked.`,
    );
    throwIfAborted(signal);
    return result;
  };
  const [shopping, retailers, context] = await Promise.all([
    run("shopping", () => searchShoppingDetailed(query, signal, forceRefresh)),
    run("retailers", () => searchMajorRetailersDetailed(query, signal, forceRefresh)),
    run("context", () => searchContextDetailed(query, signal)),
  ]);
  const hasObservedProvider = [shopping, retailers, context].some(
    (batch) => batch.status === "success" || batch.status === "empty",
  );
  return {
    query,
    mode: "live",
    shopping,
    retailers,
    context,
    ...(hasObservedProvider ? { observedAt: new Date().toISOString() } : {}),
  };
}

export interface CollectedEvidence {
  evidence: SourceEvidence;
  fromCache: boolean;
}

export async function collectEvidence(
  query: string,
  mode: "live" | "demo",
  forceRefresh = false,
  signal?: AbortSignal,
  progress?: EvidenceProgress,
): Promise<CollectedEvidence> {
  const cacheKey = `${ANALYSIS_VERSION}:${mode}:${normalizeKey(query)}`;
  if (!forceRefresh) {
    const cached = getEvidence(cacheKey);
    if (cached) {
      for (const step of ["shopping", "retailers", "context"] as const) progress?.(step, "done", "Using recently cached source evidence.");
      return { evidence: cached, fromCache: true };
    }
    const running = getInFlight(cacheKey);
    if (running) return { evidence: await running, fromCache: true };
  }

  if (mode === "demo") {
    const evidence = fixture(query);
    progress?.(
      "shopping",
      "running",
      "Loading labelled demo shopping fixtures…",
    );
    progress?.("shopping", "done", "Demo shopping fixtures loaded.");
    progress?.(
      "retailers",
      "running",
      "Loading labelled demo retailer fixtures…",
    );
    progress?.("retailers", "done", "Demo retailer fixtures loaded.");
    progress?.("context", "running", "Loading labelled demo context fixtures…");
    progress?.("context", "done", "Demo context fixtures loaded.");
    setEvidence(cacheKey, evidence);
    return { evidence, fromCache: false };
  }

  const running = getInFlight(cacheKey);
  if (running) return { evidence: await running, fromCache: true };
  const promise = collectLive(query, signal, progress, forceRefresh);
  setInFlight(cacheKey, promise);
  const evidence = await promise;
  const hasObservedSource = [
    evidence.shopping,
    evidence.retailers,
    evidence.context,
  ].some((batch) => batch.status === "success" || batch.status === "empty");
  // A provider outage is not useful evidence and should not poison the source
  // cache. Successful empty scans are still genuine observations and are safe to cache.
  const partialFailure = [evidence.shopping, evidence.retailers, evidence.context].some((batch) => batch.status === "error") || evidence.retailers.coverage?.some((store) => store.status === "error");
  if (hasObservedSource) setEvidence(cacheKey, evidence, partialFailure ? 60_000 : 600_000);
  return { evidence, fromCache: false };
}

export function createDemoEvidence(query: string): SourceEvidence {
  return fixture(query);
}
