import "../config";
import axios from "axios";
import { ProviderBatch, SearchResult, ShoppingResult, RetailerCoverage } from "../types";
import {
  extractPriceFromText,
  MAX_PRICE,
  safeHttpUrl,
  sourceNameFromUrl,
  assessListing,
  plausibleProductPrice,
  enrichListingTitle,
  discoveryListingMatches,
} from "./validation";
import { retailerForUrl, retailerForName, retailersForQuery, isRetailerProductUrl, canonicalRetailerUrl, productTitleFromUrl } from "./retailers";
import { verifyRetailerListing } from "./retailerPageClient";

const BASE_URL = "https://serpapi.com/search.json";
const DEFAULT_TIMEOUT = 35_000;

function providerTimeout(): number {
  const configured = Number(process.env.SERPAPI_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? Math.min(Math.max(configured, 1000), 45_000)
    : DEFAULT_TIMEOUT;
}

function key(): string | undefined {
  return process.env.SERPAPI_KEY?.trim() || undefined;
}
function text(value: unknown, limit = 2000): string {
  return typeof value === "string" ? value.slice(0, limit).trim() : "";
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.slice(0, 50).map(record) : [];
}

export function containsForeignCurrency(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /[€$£¥₽]|\b(?:USD|EUR|GBP|JPY|CNY|AED|AUD|CAD|PKR|BDT|NPR)\b/i.test(value)
  );
}

export function parsePrice(value: unknown, allowBareNumber = true): number {
  if (containsForeignCurrency(value)) return 0;
  if (typeof value === "number")
    return allowBareNumber &&
      Number.isFinite(value) &&
      value > 0 &&
      value <= MAX_PRICE
      ? value
      : 0;
  if (typeof value !== "string") return 0;
  const found = extractPriceFromText(value);
  if (found !== null) return found;
  if (allowBareNumber && /^\d+(?:\.\d{1,2})?$/.test(value)) {
    const parsed = Number(value);
    return parsed > 0 && parsed <= MAX_PRICE ? parsed : 0;
  }
  return 0;
}

export function normalizeStoreName(raw: string, link = ""): string {
  return retailerForUrl(link)?.name ?? retailerForName(raw)?.name ?? (raw.trim().slice(0, 120) || sourceNameFromUrl(link));
}

function failureMessage(error: unknown, provider: string): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
        return `${provider} timed out; no evidence was added. Try refreshing the search.`;
    if (error.response?.status)
      return `${provider} returned HTTP ${error.response.status}; no evidence was added.`;
  }
  return `${provider} was unavailable or returned an invalid response; no evidence was added.`;
}

async function requestSerp(
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const apiKey = key();
  if (!apiKey) throw new Error("provider-not-configured");
  const response = await axios.get(BASE_URL, {
    params: { ...params, gl: "in", hl: "en", api_key: apiKey },
    timeout: providerTimeout(),
    signal,
    maxContentLength: 2_000_000,
    maxRedirects: 0,
  });
  const data = record(response.data);
  if (/^Google hasn't returned any results for this query\.?$/i.test(text(data.error))) return { ...data, shopping_results: [], organic_results: [] };
  // HTTP 200 can carry quota, authentication, or upstream errors. Never classify
  // these as a successful empty scan, and never expose the provider's raw text.
  if (
    !Object.keys(data).length ||
    data.error ||
    record(data.search_metadata).status === "Error"
  )
    throw new Error("provider-response-error");
  return data;
}

export function parseShoppingRows(
  value: unknown,
): ProviderBatch<ShoppingResult> {
  let excludedCount = 0;
  const items: ShoppingResult[] = [];
  for (const row of asRecords(value)) {
    const link = [row.link, row.product_link].find(isRetailerProductUrl) ?? "";
    const currency = text(row.currency).toUpperCase();
    // gl=in is not proof of currency. Numeric extracted_price is usable only
    // with an explicit INR currency field or an unambiguous INR display price.
    const foreign =
      containsForeignCurrency(row.price) ||
      (currency !== "" && !["INR", "₹"].includes(currency));
    const price = foreign
      ? 0
      : parsePrice(row.price, ["INR", "₹"].includes(currency)) ||
        (["INR", "₹"].includes(currency) ? parsePrice(row.extracted_price, true) : 0);
    const rawTitle = text(row.title, 600);
    const title = /^https?:\/\//i.test(rawTitle) ? productTitleFromUrl(link) : rawTitle;
    if (!price || !link || !title || /\+\s*$|\b(?:from|starting|per month|monthly|emi)\b/i.test(text(row.price))) {
      excludedCount++;
      continue;
    }
    items.push({
      title,
      price,
      source: normalizeStoreName(text(row.source || row.seller, 120), link),
      link: canonicalRetailerUrl(link),
      priceSource: "google_shopping",
      checkedAt: new Date().toISOString(),
      availability: /out of stock|sold out|unavailable|pre.?order/i.test(text(row.availability)) ? "out_of_stock" : /\bin stock\b/i.test(text(row.availability)) ? "in_stock" : "unknown",
      ...(typeof row.rating === "number" ? { rating: row.rating } : {}),
      ...(safeHttpUrl(row.thumbnail) ? { thumbnail: row.thumbnail } : {}),
      ...(typeof row.delivery === "string"
        ? { delivery: text(row.delivery, 240) }
        : {}),
      snippet: `${title}. Provider display price: ${text(row.price) || `INR ${price}`}${text(row.delivery) ? `. ${text(row.delivery, 240)}` : ""}`,
    });
  }
  return { items, excludedCount, status: items.length ? "success" : "empty" };
}

export function parseRetailerRows(
  value: unknown,
  includeUnpriced = false,
): ProviderBatch<ShoppingResult> {
  const items: ShoppingResult[] = [];
  let excludedCount = 0;
  for (const row of asRecords(value)) {
    const link = text(row.link, 4096);
    const source = retailerForUrl(link)?.name;
    const rawTitle = text(row.title, 600);
    const snippet = text(row.snippet);
    const title = enrichListingTitle(/^https?:\/\//i.test(rawTitle) ? productTitleFromUrl(link) : rawTitle, `${snippet} ${productTitleFromUrl(link)}`);
    if (!source || !title || !isRetailerProductUrl(link)) {
      excludedCount++;
      continue;
    }
    const rich = record(row.rich_snippet);
    const blocks = [record(rich.top), record(rich.bottom)];
    const ext = blocks.map((block) => record(block.detected_extensions)).find((extension) => extension.price !== undefined || extension.price_from !== undefined) ?? {};
    const extensions = blocks.flatMap((block) => Array.isArray(block.extensions) ? block.extensions.filter((item) => typeof item === "string") : []).join(" ");
    const currency = text(ext.currency).toUpperCase();
    const foreign =
      containsForeignCurrency(extensions) ||
      containsForeignCurrency(snippet) ||
      (currency !== "" && !["INR", "₹"].includes(currency));
    // A "from" range, MRP, monthly payment, coupon, or multi-price snippet is
    // not a confirmed purchase price. Do not silently use the first number.
    const ambiguous =
      /\b(?:EMI|per month|monthly|MRP|M\.R\.P|starting|from|up to|upto)\b|\/(?:mo|month)/i.test(
        `${snippet} ${extensions}`,
      ) ||
      ext.price_from !== undefined ||
      ext.price_to !== undefined ||
      /\b(?:delivery|shipping|cashback|coupon|exchange|bank|save)\b/i.test(`${snippet} ${extensions}`);
    let price = 0;
    if (!foreign && ext.price_from === undefined && ext.price_to === undefined) {
      // A structured Offer price is distinct from the surrounding MRP/EMI text.
      if (!/\b(?:EMI|monthly|per month|from|starting)\b/i.test(extensions)) price = ["INR", "₹"].includes(currency) ? parsePrice(ext.price, true) : 0;
      if (!price && !ambiguous) price = parsePrice(extensions, false) || extractPriceFromText(snippet) || 0;
    }
    if (!price && !includeUnpriced) {
      excludedCount++;
      continue;
    }
    items.push({
      title,
      price,
      source,
      link: canonicalRetailerUrl(link),
      priceSource: "search_index",
      checkedAt: new Date().toISOString(),
      availability: /out of stock|sold out|currently unavailable|pre.?order/i.test(`${snippet} ${extensions}`) ? "out_of_stock" : /\bin stock\b/i.test(extensions) ? "in_stock" : "unknown",
      snippet: snippet || extensions || `Structured INR price: ${price}`,
    });
  }
  return { items, excludedCount, status: items.length ? "success" : "empty" };
}

export async function searchShoppingDetailed(
  query: string,
  signal?: AbortSignal,
  forceRefresh = false,
): Promise<ProviderBatch<ShoppingResult>> {
  if (!key())
    return {
      items: [],
      status: "error",
      warning:
        "Live shopping is unavailable: SERPAPI_KEY is not configured. Configure the server or choose demo mode.",
    };
  try {
    const data = await requestSerp(
      { engine: "google_shopping", q: buildProductSearchQuery(query), ...(forceRefresh ? { no_cache: "true" } : {}) },
      signal,
    );
    const rows = asRecords(data.shopping_results);
    const batch = parseShoppingRows(rows);
    // Shopping links now often point to Google's popup rather than the merchant.
    // Resolve relevant product popups into actual retailer offers before trusting them.
    const candidates = rows.filter((row) => text(row.immersive_product_page_token) && discoveryMatch(query, text(row.title)) && plausibleProductPrice(query, parsePrice(row.price)))
      .sort((a, b) => Number(Boolean(retailerForName(text(b.source)))) - Number(Boolean(retailerForName(text(a.source)))) || parsePrice(a.price) - parsePrice(b.price));
    const tokens = [...new Set(candidates.map((row) => text(row.immersive_product_page_token, 20000)))].slice(0, 3);
    const resolved = await Promise.all(tokens.map(async (token) => {
      try {
        const popup = await requestSerp({ engine: "google_immersive_product", page_token: token, more_stores: "true", ...(forceRefresh ? { no_cache: "true" } : {}) }, signal);
        return parseImmersiveProductRows(popup);
      } catch { return { items: [], status: "error" as const }; }
    }));
    const items = [...batch.items, ...resolved.flatMap((result) => result.items)];
    return { ...batch, items, status: items.length ? "success" : "empty" };
  } catch (error) {
    return {
      items: [],
      status: "error",
      warning: failureMessage(error, "Shopping provider"),
    };
  }
}

export async function searchMajorRetailersDetailed(
  query: string,
  signal?: AbortSignal,
  forceRefresh = false,
): Promise<ProviderBatch<ShoppingResult>> {
  const stores = retailersForQuery(query);
  const results = await mapConcurrent(stores, 4, async (store) => {
    const cleanQuery = buildProductSearchQuery(query);
    const searchQuery = `site:${store.domain} ${cleanQuery}`;
    const coverage: RetailerCoverage = { id: store.id, name: store.name, domain: store.domain, status: "empty", count: 0, searchUrl: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}` };
    if (!key()) return { items: [] as ShoppingResult[], excludedCount: 0, coverage: { ...coverage, status: "error" as const, message: "SERPAPI_KEY is not configured." } };
    try {
      if (signal?.aborted) throw new Error("aborted");
      const data = await requestSerp({ engine: "google", q: cleanQuery, as_sitesearch: store.domain, tbs: "li:1", num: 10, ...(forceRefresh ? { no_cache: "true" } : {}) }, signal);
      const parsed = parseRetailerRows(data.organic_results, true);
      const relevant = parsed.items.filter((item) => retailerForUrl(item.link)?.domain === store.domain && discoveryListingMatches(query, item.title));
      const candidates = [...new Map(relevant.map((item) => [item.link, item])).values()].slice(0, 3);
      const verified = await mapConcurrent(candidates, 2, (item) => verifyRetailerListing(item, query, signal, forceRefresh));
      const items = verified.filter((item): item is ShoppingResult => item !== null && item.availability !== "out_of_stock" && plausibleProductPrice(query, item.price));
      return { items, excludedCount: (parsed.excludedCount ?? 0) + parsed.items.length - items.length, coverage: { ...coverage, status: items.length ? "success" as const : "empty" as const, count: items.length, ...(!items.length ? { message: "No matching, available product with a usable INR price was found." } : {}) } };
    } catch (error) {
      return { items: [] as ShoppingResult[], excludedCount: 0, coverage: { ...coverage, status: "error" as const, message: failureMessage(error, store.name) } };
    }
  });
  const items = results.flatMap((result) => result.items);
  const coverage = results.map((result) => result.coverage);
  const warnings = coverage.filter((store) => store.status === "error").map((store) => store.message!);
  return { items, coverage, warnings, excludedCount: results.reduce((sum, result) => sum + result.excludedCount, 0), status: items.length ? "success" : coverage.every((store) => store.status === "error") ? "error" : "empty", ...(!key() ? { warning: "Live retailer evidence is unavailable: SERPAPI_KEY is not configured." } : {}) };
}

export function buildProductSearchQuery(query: string): string {
  const clean = query.replace(/\b\d+(?:\.\d+)?\s*[- ]?inch(?:es)?\b|\b\d+(?:\.\d+)?["″]/gi, " ")
    .replace(/\b(?:ram|ssd|storage|unified memory)\b/gi, " ")
    .replace(/["<>]/g, " ").replace(/\b(?:site|inurl|intitle):\S+/gi, " ").replace(/\s+/g, " ").trim();
  return clean;
}

function discoveryMatch(query: string, title: string): boolean {
  if (discoveryListingMatches(query, title)) return true;
  if (/\bmacbook\b/i.test(query) && !/\bm\d+\b/i.test(title)) {
    // A generic Shopping card is discovery only; its resolved store titles must
    // still pass every model/specification check before a price can be retained.
    return assessListing(query.replace(/\bm\d+\s*(?:pro|max|ultra)?\b/gi, "").replace(/\b\d+(?:gb|tb)\s*(?:ram|ssd|storage)?\b/gi, "").replace(/\b\d+[- ]inch\b/gi, ""), title).accepted;
  }
  return false;
}

export function parseImmersiveProductRows(value: unknown): ProviderBatch<ShoppingResult> {
  const product = record(record(value).product_results);
  return parseShoppingRows(asRecords(product.stores).map((store) => ({
    ...store, title: text(store.title) || text(product.title), source: store.name,
    thumbnail: Array.isArray(product.thumbnails) ? product.thumbnails[0] : undefined,
    availability: Array.isArray(store.details_and_offers) ? store.details_and_offers.join(" ") : "",
    delivery: text(store.shipping),
  })));
}

async function mapConcurrent<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(items.length, limit) }, async () => {
    while (next < items.length) { const index = next++; results[index] = await task(items[index]); }
  }));
  return results;
}

export async function searchContextDetailed(
  query: string,
  signal?: AbortSignal,
): Promise<ProviderBatch<SearchResult>> {
  if (!key())
    return {
      items: [],
      status: "error",
      warning:
        "Live context evidence is unavailable: SERPAPI_KEY is not configured.",
    };
  try {
    const data = await requestSerp(
      { engine: "google", q: `${query} price`, tbs: "qdr:y", num: 10 },
      signal,
    );
    const rows = asRecords(data.organic_results);
    const items = rows
      .map((row) => ({
        title: text(row.title, 600),
        link: text(row.link, 4096),
        snippet: text(row.snippet),
        date: text(row.date, 120) || undefined,
      }))
      .filter((item) => safeHttpUrl(item.link) && item.title && item.snippet)
      .slice(0, 10);
    return {
      items,
      excludedCount: rows.length - items.length,
      status: items.length ? "success" : "empty",
    };
  } catch (error) {
    return {
      items: [],
      status: "error",
      warning: failureMessage(error, "Context provider"),
    };
  }
}

export async function searchShopping(
  query: string,
  signal?: AbortSignal,
): Promise<ShoppingResult[]> {
  return (await searchShoppingDetailed(query, signal)).items;
}
export async function searchMajorRetailers(
  query: string,
  signal?: AbortSignal,
): Promise<ShoppingResult[]> {
  return (await searchMajorRetailersDetailed(query, signal)).items;
}
export async function searchGoogle(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  return (await searchContextDetailed(query, signal)).items;
}
