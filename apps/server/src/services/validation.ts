import { ShoppingResult, SellerPrice, ComparisonInfo } from "../types";
import { retailerForUrl } from "./retailers";

export const MAX_QUERY_LENGTH = 240;
export const MAX_PRICE = 10_000_000;
const ACCESSORY_WORDS =
  /\b(cases?|covers?|skins?|wraps?|pouches?|sleeves?|bags?|backpacks?|protectors?|straps?|ear\s*tips?|cables?|adapters?|stands?|replacements?|ear\s*pads?|silicone|cleaning kits?|mounts?|docks?|decals?|stickers?|keycaps?)\b/i;
const BOOK_WORDS = /\b(?:books?|ebooks?|e-books?|handbooks?|manuals?|user guides?|beginners? guides?|guide for|for beginners|kindle|paperback|hardcover)\b/i;
const REFURBISHED_WORDS =
  /\b(refurbished|renewed|used|pre[- ]owned|open[- ]box|openbox|second[- ]hand)\b/i;
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "price",
  "buy",
  "online",
  "india",
  "offer",
  "deal",
  "new",
  "in",
  "of",
  "at",
]);

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly status = 422,
  ) {
    super(message);
  }
}

export interface ValidatedClaims {
  claimedPrice?: number;
  claimedOriginalPrice?: number;
}
export interface ListingAssessment {
  accepted: boolean;
  match: "strong" | "possible";
  reason?: string;
}

const DESCRIPTIVE_WORDS = new Set([
  "laptop", "laptops", "headphones", "headphone", "earbuds", "wireless", "bluetooth",
  "noise", "cancelling", "canceling", "smartphone", "phone", "mobile", "inch", "inches",
  "ram", "ssd", "hdd", "memory", "storage", "unified", "chip", "display", "retina", "liquid",
  "cpu", "gpu", "core", "cores", "ai", "built", "intelligence", "english", "keyboard",
  "generation", "gen", "official", "colour", "color", "gb", "tb",
]);

export function parsePriceClaim(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > MAX_PRICE
  ) {
    throw new ValidationError(
      `${field} must be a finite, positive INR number no greater than 10,000,000.`,
    );
  }
  return value;
}

export function validateClaims(
  rawClaimed: unknown,
  rawOriginal: unknown,
): ValidatedClaims {
  const claimedPrice = parsePriceClaim(rawClaimed, "claimedPrice");
  const claimedOriginalPrice = parsePriceClaim(
    rawOriginal,
    "claimedOriginalPrice",
  );
  if (
    claimedPrice !== undefined &&
    claimedOriginalPrice !== undefined &&
    claimedOriginalPrice < claimedPrice
  ) {
    throw new ValidationError(
      "claimedOriginalPrice must be greater than or equal to claimedPrice.",
    );
  }
  return { claimedPrice, claimedOriginalPrice };
}

export function normalizeQuery(query: string): string {
  return sanitizeProductQuery(query).toLowerCase();
}

/** Preserve model/SKU identity; do not guess which alphanumeric tokens are noise. */
export function sanitizeProductQuery(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/(?:[′’']{2}|[″”])/g, '"')
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b(?:utm_[a-z_]+|ref|tag|psc|qid)=[^\s&]+/gi, " ")
    .replace(
      /\b(?:macos\s+(?:tahoe|sequoia|sonoma|ventura|monterey|catalina)|windows\s+(?:10|11)(?:\s+(?:home|pro))?|android\s+\d+)\b/gi,
      " ",
    )
    .replace(
      /(\d+)\s+(gb|tb|mah|hz|mp|w)\b/gi,
      (_match, amount: string, unit: string) =>
        `${amount}${unit.toUpperCase()}`,
    )
    .replace(/[|<>\[\]{}]+/g, " ")
    .replace(/\bmac\s+book\b/gi, "MacBook")
    .replace(/\bi\s+phone\b/gi, "iPhone")
    .replace(/\bone\s+plus\b/gi, "OnePlus")
    .replace(/\bplay\s*station\s*5\b/gi, "PS5")
    .replace(/\b(m|s)\s+(\d{1,2})(?=\b)/gi, "$1$2")
    .replace(/\b(\d)(?:st|nd|rd|th)?\s*(?:gen|generation)\b/gi, "Gen$1")
    .replace(/\b(?:gen|generation)\s*(\d)\b/gi, "Gen$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateProductQuery(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim())
    throw new ValidationError("productQuery is required.", 400);
  if (/https?:\/\/|www\./i.test(raw))
    throw new ValidationError(
      "Resolve the product URL first, or send the product name and model.",
    );
  const query = sanitizeProductQuery(raw);
  if (query.length < 2 || !/[\p{L}\p{N}]/u.test(query))
    throw new ValidationError(
      "Provide a product name and, if available, its model.",
    );
  if (query.length > MAX_QUERY_LENGTH)
    throw new ValidationError(
      `productQuery must be at most ${MAX_QUERY_LENGTH} characters.`,
    );
  if (/https?:\/\/|www\./i.test(query))
    throw new ValidationError(
      "Resolve the product URL first, or send the product name and model.",
    );
  return query;
}

export function safeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096) return false;
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function words(value: string): string[] {
  return Array.from(
    new Set(
      sanitizeProductQuery(value)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .split(/\s+/)
        .filter((word) => word && !STOP_WORDS.has(word)),
    ),
  );
}

function modelTokens(value: string): string[] {
  const withoutSpecs = sanitizeProductQuery(value).toLowerCase()
    .replace(/\b\d+(?:\.\d+)?\s*[- ]?(?:gb|tb|mah|hz|mp|w|inch(?:es)?|in|core)\b/g, " ")
    .replace(/\b\d+(?:\.\d+)?["″]/g, " ");
  return (
    withoutSpecs.match(/\b[a-z0-9]+(?:[-/][a-z0-9]+)*\b/g) ?? []
  ).filter(
    (token) =>
      /\d/.test(token) && !(/macbook/i.test(value) && /^(?:1[1-7])$/.test(token)),
  );
}

function hasIdentifier(title: string, token: string): boolean {
  // Accept WH1000XM5 / WH-1000XM5 / WH 1000XM5, not WH-1000XM50.
  const pattern = token
    .replace(/[^a-z0-9]/g, "")
    .split("")
    .join("[-\\s/]*");
  return new RegExp(`(?:^|[^a-z0-9])${pattern}(?![a-z0-9])`, "i").test(title);
}

interface Specifications {
  memory?: number;
  storage?: number;
  screen?: string;
  capacities: number[];
}

function specifications(value: string): Specifications {
  const text = sanitizeProductQuery(value).toLowerCase();
  const capacities = [...text.matchAll(/\b(\d+(?:\.\d+)?)\s*(gb|tb)\b/g)].map((m) => Number(m[1]) * (m[2] === "tb" ? 1024 : 1));
  const amount = (match: RegExpMatchArray | null) => match ? Number(match[1]) * (match[2] === "tb" ? 1024 : 1) : undefined;
  const memory = amount(text.match(/\b(\d+)\s*(gb|tb)\s*(?:unified\s+)?(?:ram|memory)\b/)) ?? amount(text.match(/\b(?:ram|memory)\s*[: -]?\s*(\d+)\s*(gb|tb)\b/)) ?? capacities.find((n) => n <= 64);
  const storage = amount(text.match(/\b(\d+(?:\.\d+)?)\s*(gb|tb)\s*(?:ssd|hdd|storage|rom)\b/)) ?? amount(text.match(/\b(?:ssd|storage|rom)\s*[: -]?\s*(\d+(?:\.\d+)?)\s*(gb|tb)\b/)) ?? capacities.find((n) => n >= 128);
  const screenMatch = text.match(/\b(\d{1,2}(?:\.\d+)?)\s*(?:[- ]?inch(?:es)?\b|["″])/)
    ?? text.match(/\bmacbook\s+(?:air|pro)\s+(1[1-7](?:\.\d+)?)\b/);
  // Apple markets its 13.6/14.2/16.2-inch displays as 13/14/16-inch models.
  const screen = screenMatch ? String(/macbook/.test(text) ? Math.floor(Number(screenMatch[1])) : Number(screenMatch[1])) : undefined;
  return { memory, storage, screen, capacities: [...new Set(capacities)] };
}

/** Enrich missing configuration fields only from this product's own description/URL. */
export function enrichListingTitle(title: string, details: string): string {
  const own = specifications(title);
  const extra = specifications(details);
  const text = sanitizeProductQuery(details);
  const additions: string[] = [];
  const configurable = /\b(?:starting\s+(?:at|from)|starts?\s+(?:at|from)|configurable|configuration options|storage options|up\s+to\s+\d+\s*(?:gb|tb)|from\s+\d+\s*(?:gb|tb))\b/i.test(text);
  const memoryValues = extra.capacities.filter((n) => n <= 64);
  const storageValues = extra.capacities.filter((n) => n >= 128);
  const screens = [...new Set([...text.matchAll(/\b(\d{1,2}(?:\.\d+)?)\s*(?:[- ]?inch(?:es)?\b|["″])/gi)].map((m) => /macbook/i.test(title) ? Math.floor(Number(m[1])) : Number(m[1])))];
  if (/\bmacbook\b/i.test(title)) {
    const chips = [...new Set([...text.matchAll(/\bm\d+\s*(?:pro|max|ultra)?\b/gi)].map((m) => m[0].trim().toUpperCase()))];
    if (!/\bm\d+\b/i.test(title) && chips.length === 1) additions.push(chips[0]);
  }
  if (!own.screen && screens.length === 1) additions.push(`${screens[0]}-inch`);
  if (!configurable && !own.memory && memoryValues.length === 1 && extra.memory) additions.push(`${extra.memory}GB RAM`);
  if (!configurable && !own.storage && storageValues.length === 1 && extra.storage) additions.push(`${extra.storage % 1024 === 0 ? `${extra.storage / 1024}TB` : `${extra.storage}GB`} SSD`);
  return [title, ...additions].join(" ").trim();
}

function accessories(value: string): boolean {
  // Bundled charging/carrying cases are not standalone accessories. Keep the
  // exclusion conservative for replacement/"case for" listings.
  return ACCESSORY_WORDS.test(
    value.replace(/\bwith (?:a )?(?:charging|carrying) case\b/gi, ""),
  );
}

export function assessListing(query: string, title: string): ListingAssessment {
  const q = sanitizeProductQuery(query);
  const t = sanitizeProductQuery(title);
  const reject = (reason: string): ListingAssessment => ({
    accepted: false,
    match: "possible",
    reason,
  });
  if (!t) return reject("listing has no title");
  if (!accessories(q) && accessories(t)) return reject("accessory listing");
  if (!BOOK_WORDS.test(q) && BOOK_WORDS.test(t)) return reject("book or user-guide listing");
  if (!accessories(q) && !BOOK_WORDS.test(q) && /\b(?:compatible with|compatible for|designed for|replacement for)\b/i.test(t)) return reject("compatibility listing, not the product itself");
  if (REFURBISHED_WORDS.test(q) !== REFURBISHED_WORDS.test(t))
    return reject("condition mismatch");

  const queryModels = modelTokens(q);
  if (queryModels.some((model) => !hasIdentifier(t, model)))
    return reject("model or generation mismatch");
  const querySpecs = specifications(q);
  const titleSpecs = specifications(t);
  if (querySpecs.capacities.some((spec) => !titleSpecs.capacities.includes(spec)) ||
    (querySpecs.memory !== undefined && titleSpecs.memory !== querySpecs.memory) ||
    (querySpecs.storage !== undefined && titleSpecs.storage !== querySpecs.storage) ||
    (querySpecs.screen !== undefined && titleSpecs.screen !== querySpecs.screen))
    return reject("storage or specification missing/mismatched");

  // Distinguish a base model from Pro/Max/Plus/Ultra/Lite/FE. These modifiers
  // materially change the item; unspecified colours do not automatically do so.
  const macbook = /\bmacbook\b/i.test(q);
  if (macbook) {
    const family = q.match(/\bmacbook\s+(air|pro)\b/i)?.[1]?.toLowerCase();
    if (family && t.match(/\bmacbook\s+(air|pro)\b/i)?.[1]?.toLowerCase() !== family) return reject("MacBook Air/Pro family mismatch");
    const chip = q.match(/\b(m\d+)\s*(pro|max|ultra)?\b/i);
    const titleChip = t.match(/\b(m\d+)\s*(pro|max|ultra)?\b/i);
    if (chip && (chip[1].toLowerCase() !== titleChip?.[1]?.toLowerCase() || (chip[2]?.toLowerCase() ?? "") !== (titleChip?.[2]?.toLowerCase() ?? ""))) return reject("processor variant mismatch");
  }
  const variants = /\b(pro|max|plus|ultra|lite|mini|fe|neo)\b/gi;
  const variantText = (value: string) => macbook ? value.replace(/\bmacbook\s+(?:air|pro)\b/gi, "MacBook").replace(/\bm\d+\s*(?:pro|max|ultra)?\b/gi, "") : value;
  const qVariants = [...variantText(q).matchAll(variants)].map((match) =>
    match[1].toLowerCase(),
  );
  const tVariants = [...variantText(t).matchAll(variants)].map((match) =>
    match[1].toLowerCase(),
  );
  if (
    qVariants.some((word) => !tVariants.includes(word)) ||
    (queryModels.length > 0 &&
      tVariants.some((word) => !qVariants.includes(word)))
  )
    return reject("product variant mismatch");

  const modelParts = new Set(
    queryModels.flatMap((model) => model.split(/[-/]/)),
  );
  const qWords = words(q).filter((word) => !modelParts.has(word));
  const tWords = new Set(words(t));
  const matched = qWords.filter((word) => tWords.has(word));
  const total = qWords.length + queryModels.length;
  const ratio = total ? (matched.length + queryModels.length) / total : 0;
  // Model identity is required above, but never let "iPhone 15" match an
  // unrelated item solely because it also has a generation number 15.
  const nameWords = qWords.filter(
    (word) => !/\d/.test(word) && !qVariants.includes(word) && !DESCRIPTIVE_WORDS.has(word) && !(word === "apple" && /\b(?:macbook|iphone|ipad|airpods|imac)\b/i.test(t)),
  );
  const nameMatches = nameWords.filter((word) => tWords.has(word));
  if (nameWords.length && nameMatches.length !== nameWords.length)
    return reject("product name does not match");
  const colorWords = /\b(midnight|starlight|silver|black|white|blue|green|pink|purple|titanium|gold)\b/gi;
  const queryColors = [...q.matchAll(colorWords)].map((m) => m[1].toLowerCase());
  if (queryColors.some((color) => !words(t).includes(color))) return reject("requested colour missing/mismatched");
  if (macbook && /\bmacbook\b/i.test(t)) return { accepted: true, match: "strong" };
  if (queryModels.length && nameWords.length && nameMatches.length === nameWords.length) return { accepted: true, match: "strong" };
  if (ratio >= 0.8 || (queryModels.length > 0 && ratio >= 0.65))
    return { accepted: true, match: "strong" };
  if (ratio >= 0.6 && matched.length >= 2)
    return { accepted: true, match: "possible" };
  return reject("listing title is not relevant enough");
}

export function discoveryListingMatches(query: string, title: string): boolean {
  const assessment = assessListing(query, title);
  if (assessment.accepted) return true;
  if (assessment.reason !== "storage or specification missing/mismatched") return false;
  const requested = specifications(query);
  const found = specifications(title);
  for (const field of ["memory", "storage", "screen"] as const) {
    if (requested[field] !== undefined && found[field] !== undefined && requested[field] !== found[field]) return false;
  }
  // A truncated search card may omit a specification. Fetch its page to learn
  // that field, but never relax the final comparison or an explicitly wrong value.
  const core = sanitizeProductQuery(query)
    .replace(/\b\d+(?:\.\d+)?\s*[- ]?(?:inch(?:es)?|gb|tb)\b|\b\d+(?:\.\d+)?["″]/gi, " ")
    .replace(/\b(?:ram|ssd|storage|unified memory)\b/gi, " ");
  return assessListing(core, title).accepted;
}

export function filterAndMatchListings(
  query: string,
  input: Array<ShoppingResult & { origin: "shopping" | "retailer" }>,
): { sellers: SellerPrice[]; excludedCount: number; comparison: ComparisonInfo; warnings: string[] } {
  let excludedCount = 0;
  const groups = new Map<string, { label: string; query: string; byMerchant: Map<string, SellerPrice> }>();
  for (const item of input) {
    if (
      !Number.isFinite(item.price) ||
      item.price <= 0 ||
      item.price > MAX_PRICE ||
      !safeHttpUrl(item.link) ||
      !retailerForUrl(item.link) ||
      item.availability === "out_of_stock"
    ) {
      excludedCount++;
      continue;
    }
    const assessment = assessListing(query, item.title);
    if (!assessment.accepted) {
      excludedCount++;
      continue;
    }
    const variant = listingVariant(query, item.title);
    if (!variant.complete || !plausibleProductPrice(query, item.price)) {
      excludedCount++;
      continue;
    }
    let group = groups.get(variant.key);
    if (!group) {
      group = { label: variant.label, query: variant.query, byMerchant: new Map() };
      groups.set(variant.key, group);
    }
    const seller: SellerPrice = {
      name: retailerForUrl(item.link)!.name,
      title: item.title.trim(),
      price: Math.round(item.price * 100) / 100,
      link: item.link,
      origin: item.origin,
      match: assessment.match,
      ...(typeof item.rating === "number" &&
      Number.isFinite(item.rating) &&
      item.rating >= 0 &&
      item.rating <= 5
        ? { rating: item.rating }
        : {}),
      ...(safeHttpUrl(item.thumbnail) ? { thumbnail: item.thumbnail } : {}),
      ...(item.delivery ? { delivery: item.delivery } : {}),
      priceSource: item.priceSource ?? (item.origin === "shopping" ? "google_shopping" : "search_index"),
      ...(item.checkedAt ? { checkedAt: item.checkedAt } : {}),
      availability: item.availability === "in_stock" ? "in_stock" : "unknown",
    };
    const key = seller.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const old = group.byMerchant.get(key);
    // One quote per merchant; repeated search hits must not inflate confidence.
    // Prefer a strong match before comparing prices.
    if (
      !old ||
      (old.match === "possible" && seller.match === "strong") ||
      (old.match === seller.match && (priceSourceRank(seller) > priceSourceRank(old) || (priceSourceRank(seller) === priceSourceRank(old) && seller.price < old.price)))
    )
      group.byMerchant.set(key, seller);
    if (old) excludedCount++;
  }
  const variants = [...groups.entries()].map(([id, group]) => ({
    id, title: group.label, query: group.query, sellerCount: group.byMerchant.size,
    lowestPrice: Math.min(...[...group.byMerchant.values()].map((s) => s.price)),
  })).sort((a, b) => b.sellerCount - a.sellerCount || a.lowestPrice - b.lowestPrice);
  if (groups.size > 1) return {
    sellers: [], excludedCount, warnings: ["Multiple configurations were found. Choose one model, screen size, RAM and storage configuration before comparing prices."],
    comparison: { status: "needs_selection", selectedVariant: null, variants },
  };
  const group = [...groups.values()][0];
  let sellers = group ? [...group.byMerchant.values()].sort((a, b) => a.price - b.price) : [];
  const warnings: string[] = [];
  if (sellers.length >= 3) {
    const mid = sellers[Math.floor(sellers.length / 2)].price;
    const retained = sellers.filter((seller) => seller.price >= mid * 0.35);
    if (retained.length !== sellers.length) {
      excludedCount += sellers.length - retained.length;
      warnings.push("An implausibly low outlier was excluded from the same-configuration comparison.");
      sellers = retained;
    }
  }
  return { sellers, excludedCount, warnings, comparison: {
    status: sellers.length >= 2 ? "ready" : "insufficient", selectedVariant: group?.label ?? null, variants,
  } };
}

function priceSourceRank(seller: SellerPrice): number {
  return seller.priceSource === "retailer_page" ? 3 : seller.priceSource === "google_shopping" ? 2 : 1;
}

export function plausibleProductPrice(query: string, price: number): boolean {
  if (accessories(query) || BOOK_WORDS.test(query) || REFURBISHED_WORDS.test(query)) return true;
  // These are broad impossibility guards, not expected prices or invented quotes.
  if (/\bmacbook\b/i.test(query)) return price >= 20_000;
  if (/\biphone\s*\d+/i.test(query)) return price >= 10_000;
  if (/\b(?:wh[- ]?1000xm\d|wf[- ]?1000xm\d)\b/i.test(query)) return price >= 5_000;
  return true;
}

function listingVariant(query: string, title: string): { key: string; label: string; query: string; complete: boolean } {
  const q = sanitizeProductQuery(query);
  const t = sanitizeProductQuery(title);
  const spec = specifications(t);
  const parts: string[] = [];
  let base = q;
  const accessory = accessories(q) || BOOK_WORDS.test(q);
  const laptop = !accessory && /\b(?:macbook|laptop|thinkpad|ideapad|vivobook|zenbook|inspiron|pavilion|spectre|yoga|surface)\b/i.test(q);
  const phone = !accessory && /\b(?:iphone|galaxy|oneplus|redmi|poco|pixel|smartphone)\b/i.test(q) && !/\b(?:buds|watch|tab|book)\b/i.test(q);
  let complete = true;
  if (/\bmacbook\b/i.test(q) && !accessory) {
    const family = t.match(/\bmacbook\s+(air|pro|neo)\b/i)?.[1];
    const chip = t.match(/\b(m\d+)\s*(pro|max|ultra)?\b/i);
    complete = Boolean(family && chip && spec.screen && spec.memory && spec.storage);
    base = `Apple MacBook ${family ? family[0].toUpperCase() + family.slice(1).toLowerCase() : ""} ${chip?.[0].trim().toUpperCase() ?? ""}`.trim();
    parts.push(base.toLowerCase());
  } else {
    const editions = [...t.matchAll(/\b(pro|max|plus|ultra|lite|mini|fe)\b/gi)].map((m) => m[1].toLowerCase()).sort();
    const generation = t.match(/\bgen([1-9])\b/i)?.[1];
    if (generation) parts.push(`gen${generation}`);
    parts.push(editions.join("-"));
    if (generation && !/\bgen\d\b/i.test(base)) base += ` Gen${generation}`;
    if (!modelTokens(q).length && !/\bairpods\b/i.test(q)) {
      const identity = words(t).filter((word) => !DESCRIPTIVE_WORDS.has(word) && !/^(?:buy|best|sale|black|white|silver|blue|green|pink|midnight|starlight|demo|listing)$/.test(word) && !/^\d+(?:gb|tb)$/.test(word));
      const canonical = identity.join(" ").replace(/\b(wh|wf)\s+(\d)/i, "$1-$2");
      parts.push(canonical);
      base = canonical || base;
    }
    if (laptop) complete = Boolean(spec.memory && spec.storage);
    if (phone) complete = Boolean(spec.storage);
  }
  if (laptop || phone) {
    if (spec.screen && laptop) parts.push(`${spec.screen}-inch`);
    if (spec.memory) parts.push(`${spec.memory}GB RAM`);
    if (spec.storage) parts.push(`${spec.storage % 1024 === 0 ? `${spec.storage / 1024}TB` : `${spec.storage}GB`} ${laptop ? "SSD" : "storage"}`);
  }
  const details = parts.filter((part) => part && part !== base.toLowerCase());
  const queryDetails = details.filter((part) => !/^gen\d|^(?:pro|max|plus|ultra|lite|mini|fe)(?:-|$)/.test(part)).map((part) => part.replace(/\s+(?:RAM|SSD|storage)$/i, ""));
  const requestedColors = q.match(/\b(?:midnight|starlight|silver|black|white|blue|green|pink|purple|titanium|gold)\b/gi) ?? [];
  const condition = q.match(REFURBISHED_WORDS)?.[0];
  const variantQuery = [base, ...queryDetails, ...(/macbook/i.test(q) && !accessory ? requestedColors : []), ...(/macbook/i.test(q) && condition ? [condition] : [])].join(" ");
  return {
    key: parts.join("|").toLowerCase() || "standard",
    label: details.length ? `${base} · ${details.join(" · ")}` : base,
    query: variantQuery,
    complete,
  };
}

export function extractPriceFromText(text: string): number | null {
  const matches = [
    ...text.matchAll(
      /(?:₹|\bINR\s*|\bRs\.?\s*)([0-9][0-9,]*(?:\.\d{1,2})?)(?![\d.])/gi,
    ),
  ];
  const prices = matches
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter(
      (price) => Number.isFinite(price) && price > 0 && price <= MAX_PRICE,
    );
  // Multiple different prices (MRP, EMI, sale ranges) cannot be safely assigned.
  return new Set(prices).size === 1 ? prices[0] : null;
}

export function extractDate(text: string): string {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  const named =
    text.match(
      /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+20\d{2})\b/i,
    ) ??
    text.match(
      /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+20\d{2})\b/i,
    );
  const value = iso?.[0] ?? named?.[1];
  if (!value) return ""; // No guessed relative or ambiguous dd/mm dates.
  const date = new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getTime() > Date.now() + 86400000
  )
    return "";
  if (
    iso &&
    (date.getUTCFullYear() !== +iso[1] ||
      date.getUTCMonth() + 1 !== +iso[2] ||
      date.getUTCDate() !== +iso[3])
  )
    return "";
  return date.toISOString().slice(0, 10);
}

export function sourceNameFromUrl(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./i, "");
  } catch {
    return "source";
  }
}
