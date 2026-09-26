export interface Retailer {
  id: string;
  name: string;
  domain: string;
  aliases?: string[];
  brand?: RegExp;
  region?: RegExp;
}

// Domain ownership, rather than a seller's self-reported name, is the trust boundary.
export const RETAILERS: Retailer[] = [
  { id: "amazon", name: "Amazon", domain: "amazon.in", aliases: ["Amazon.in"] },
  { id: "flipkart", name: "Flipkart", domain: "flipkart.com" },
  { id: "croma", name: "Croma", domain: "croma.com" },
  { id: "reliance", name: "Reliance Digital", domain: "reliancedigital.in" },
  { id: "vijay", name: "Vijay Sales", domain: "vijaysales.com" },
  { id: "tatacliq", name: "Tata CLiQ", domain: "tatacliq.com" },
  { id: "jiomart", name: "JioMart", domain: "jiomart.com" },
  { id: "myntra", name: "Myntra", domain: "myntra.com", brand: /\b(?:shoes?|sneakers?|clothing|shirts?|jeans|nike|adidas|puma)\b/i },
  { id: "nykaa", name: "Nykaa", domain: "nykaa.com", brand: /\b(?:cosmetics?|makeup|lipstick|skincare|perfume|shampoo)\b/i },
  { id: "apple", name: "Apple India", domain: "apple.com", brand: /\b(?:apple|mac\s*book|iphone|ipad|airpods|imac)\b/i, region: /^\/in(?:\/|$)/i },
  { id: "samsung", name: "Samsung India", domain: "samsung.com", brand: /\b(?:samsung|galaxy)\b/i, region: /^\/in(?:\/|$)/i },
  { id: "sony", name: "Sony India", domain: "sony.co.in", brand: /\b(?:sony|wh[- ]?1000|wf[- ]?1000)\b/i },
  { id: "sony-store", name: "Sony India", domain: "shopatsc.com", brand: /\b(?:sony|playstation|ps5|dualsense)\b/i },
  { id: "boat", name: "boAt Official", domain: "boat-lifestyle.com", brand: /\b(?:boat|airdopes)\b/i },
  { id: "oneplus", name: "OnePlus India", domain: "oneplus.in", brand: /\bone\s*plus\b/i },
  { id: "mi", name: "Xiaomi India", domain: "mi.com", brand: /\b(?:xiaomi|redmi|poco)\b/i, region: /^\/in(?:\/|$)/i },
  { id: "dell", name: "Dell India", domain: "dell.com", brand: /\bdell\b/i, region: /^\/en-in(?:\/|$)/i },
  { id: "lenovo", name: "Lenovo India", domain: "lenovo.com", brand: /\b(?:lenovo|thinkpad|ideapad)\b/i, region: /^\/in(?:\/|$)/i },
];

export function retailerForUrl(value: unknown): Retailer | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port))) return undefined;
    const host = url.hostname.toLowerCase();
    return RETAILERS.find((store) =>
      (host === store.domain || host.endsWith(`.${store.domain}`)) &&
      (!store.region || store.region.test(url.pathname)),
    );
  } catch {
    return undefined;
  }
}

export function retailersForQuery(query: string): Retailer[] {
  return RETAILERS.filter((store) => !store.brand || store.brand.test(query));
}

export function retailerForName(value: string): Retailer | undefined {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return RETAILERS.find((store) => [store.name, store.domain, ...(store.aliases ?? [])].some((alias) => alias.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized));
}

export function isRetailerProductUrl(value: unknown): value is string {
  const store = retailerForUrl(value);
  if (!store || typeof value !== "string") return false;
  const url = new URL(value);
  const path = url.pathname;
  if (/\/(?:search|s|c|browse|collection|category|categories|blog|blogs|unboxed|news|help|support|offers?|sale|product-reviews)(?:\/|$)/i.test(path) || ["k", "search", "q", "query"].some((key) => url.searchParams.has(key))) return false;
  if (store.id === "amazon") return /\/(?:dp|gp\/product)\/[A-Z0-9]{10}(?:\/|$)/i.test(path);
  if (store.id === "flipkart") return /\/p\/itm[a-z0-9]+(?:\/|$)/i.test(path);
  if (["croma", "reliance"].includes(store.id)) return /\/p\/[a-z0-9]+(?:\/|$)/i.test(path);
  if (store.id === "tatacliq") return /\/p-mp\d+/i.test(path);
  if (store.id === "jiomart") return /\/(?:p|product)\//i.test(path);
  if (store.id === "vijay") return /\/p\/P\d+\/\d+\//i.test(path) || /\/product\//i.test(path) || /\/[^/]+\/\d+(?:\/|$)/.test(path);
  if (store.id === "myntra") return /\/\d+\/buy(?:\/|$)/.test(path);
  if (store.id === "nykaa") return /\/p\/\d+/.test(path);
  return path.split("/").filter(Boolean).length >= 2;
}

export function canonicalRetailerUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(?:utm_|ref$|tag$|qid$|sr$|psc$|aff|pid$|lid$|otracker|gclid$|srsltid$)/i.test(key)) url.searchParams.delete(key);
  }
  // Flipkart pid/lid and Amazon tracking parameters do not identify a different product page.
  return url.toString();
}

export function productTitleFromUrl(value: string): string {
  if (!isRetailerProductUrl(value)) return "";
  const url = new URL(value);
  const segments = url.pathname.split("/").filter(Boolean);
  const slug = segments.filter((segment) => segment.includes("-") && /[a-z]/i.test(segment)).sort((a, b) => b.length - a.length)[0];
  if (!slug) return "";
  try {
    return decodeURIComponent(slug)
      .replace(/\b(\d{1,2})-(\d)-inch/gi, "$1.$2-inch")
      .replace(/[-_]+/g, " ")
      .replace(/\b(wh|wf)\s+(?=\d)/gi, "$1-")
      .replace(/\b(\d+)\s+(gb|tb)\b/gi, "$1$2")
      .trim();
  } catch { return ""; }
}
