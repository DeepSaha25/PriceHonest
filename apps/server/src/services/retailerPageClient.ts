import axios from "axios";
import { ShoppingResult } from "../types";
import { assessListing, MAX_PRICE, enrichListingTitle, discoveryListingMatches } from "./validation";
import { productTitleFromUrl } from "./retailers";
import { isRetailerProductUrl, retailerForUrl } from "./retailers";

type RecordValue = Record<string, unknown>;
const object = (v: unknown): RecordValue => v && typeof v === "object" && !Array.isArray(v) ? v as RecordValue : {};
const string = (v: unknown): string => typeof v === "string" ? v.trim() : "";

function decodeHtml(text: string): string {
  return text.replace(/&(?:amp|quot|apos|lt|gt|nbsp);|&#(?:x[0-9a-f]+|\d+);/gi, (entity) => {
    const named: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " " };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const n = entity.startsWith("&#x") ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10);
    return Number.isFinite(n) && n <= 0x10ffff ? String.fromCodePoint(n) : "";
  });
}

function cleanText(value: unknown): string {
  return decodeHtml(string(value)).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 1000).trim();
}

function collectProducts(value: unknown, products: RecordValue[], depth = 0): void {
  if (depth > 6 || products.length >= 30) return;
  if (Array.isArray(value)) {
    value.slice(0, 50).forEach((item) => collectProducts(item, products, depth + 1));
    return;
  }
  const row = object(value);
  const types = Array.isArray(row["@type"]) ? row["@type"] : [row["@type"]];
  if (types.some((type) => /(?:^|\/)Product$/i.test(string(type)))) products.push(row);
  for (const key of ["@graph", "mainEntity", "item", "itemListElement"]) if (row[key]) collectProducts(row[key], products, depth + 1);
}

function availability(value: unknown): "in_stock" | "out_of_stock" | "unknown" {
  const text = string(value);
  if (/OutOfStock|SoldOut|Discontinued|PreOrder|BackOrder/i.test(text)) return "out_of_stock";
  return /InStock|LimitedAvailability/i.test(text) ? "in_stock" : "unknown";
}

function price(value: unknown): number {
  const n = typeof value === "number" ? value : Number(string(value).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 && n <= MAX_PRICE ? n : 0;
}

export interface PageProduct {
  title: string;
  price: number;
  availability: "in_stock" | "out_of_stock" | "unknown";
}

/** Read only prices attached to the matching Product's Offer, never arbitrary page numbers. */
export function parseRetailerProductPage(html: string, query: string): PageProduct | null {
  const products: RecordValue[] = [];
  for (const match of [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].slice(0, 30)) {
    try { collectProducts(JSON.parse(match[1].trim()), products); } catch { /* malformed third-party markup */ }
  }
  const matches: PageProduct[] = [];
  for (const product of products) {
    const properties = (Array.isArray(product.additionalProperty) ? product.additionalProperty : []).map(object)
      .filter((p) => /ram|memory|storage|ssd|screen|display|processor/i.test(string(p.name)))
      .map((p) => `${cleanText(p.value)} ${cleanText(p.name)}`).join(" ");
    const title = enrichListingTitle([cleanText(product.name), properties].filter(Boolean).join(" "), `${cleanText(product.description)} ${cleanText(product.url) ? productTitleFromUrl(cleanText(product.url)) : ""}`);
    if (!assessListing(query, title).accepted) continue;
    const offers = (Array.isArray(product.offers) ? product.offers : [product.offers]).map(object);
    const valid = offers.filter((offer) => !/AggregateOffer/i.test(string(offer["@type"])) && ["INR", "₹"].includes(string(offer.priceCurrency).toUpperCase()));
    const prices = [...new Set(valid.map((offer) => price(offer.price)).filter(Boolean))];
    // A Product with variant/range pricing cannot supply one like-for-like quote.
    if (prices.length !== 1) continue;
    const offer = valid.find((o) => price(o.price) === prices[0])!;
    const stock = availability(offer.availability);
    if (offer.priceValidUntil && new Date(string(offer.priceValidUntil)).getTime() < Date.now() - 86400000) continue;
    matches.push({ title, price: prices[0], availability: stock });
  }
  if (matches.length) {
    const distinct = new Set(matches.map((item) => `${item.title.toLowerCase()}|${item.price}`));
    return distinct.size === 1 ? matches[0] : null;
  }
  // OpenGraph product price is an acceptable fallback only on an explicit product page.
  const meta = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = new Map([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((m) => [m[1].toLowerCase(), decodeHtml(m[2])]));
    const key = attrs.get("property") ?? attrs.get("name");
    if (key && attrs.has("content")) meta.set(key.toLowerCase(), attrs.get("content")!);
  }
  const title = cleanText(meta.get("og:title"));
  const currency = meta.get("product:price:currency") ?? meta.get("og:price:currency");
  const amount = price(meta.get("product:price:amount") ?? meta.get("og:price:amount"));
  if (meta.get("og:type") === "product" && currency === "INR" && amount && assessListing(query, title).accepted) {
    return { title, price: amount, availability: availability(meta.get("product:availability")) };
  }
  return null;
}

const pageCache = new Map<string, { expiresAt: number; html: string | null }>();

export async function verifyRetailerListing(item: ShoppingResult, query: string, signal?: AbortSignal, forceRefresh = false): Promise<ShoppingResult | null> {
  if (!isRetailerProductUrl(item.link) || !discoveryListingMatches(query, item.title)) return null;
  let html: string | null = null;
  const cached = pageCache.get(item.link);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) html = cached.html;
  else {
    try {
      let url = item.link;
      // Follow only redirects that remain inside the allowlisted Indian storefront.
      for (let redirect = 0; redirect < 4; redirect++) {
        if (!retailerForUrl(url)) break;
        const response = await axios.get(url, {
          timeout: 7000, signal, maxRedirects: 0, maxContentLength: 2_000_000,
          responseType: "text", validateStatus: (status) => status >= 200 && status < 400,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; PriceHonest/2.0)", Accept: "text/html" },
        });
        if (response.status >= 300 && response.headers.location) {
          const next = new URL(response.headers.location, url).toString();
          if (retailerForUrl(next)?.domain !== retailerForUrl(item.link)?.domain) break;
          url = next;
          continue;
        }
        if (typeof response.data === "string" && /text\/html/i.test(String(response.headers["content-type"] ?? ""))) html = response.data;
        break;
      }
    } catch { /* An inaccessible page does not turn an indexed price into a verified one. */ }
    if (signal?.aborted) return null;
    if (pageCache.size >= 100) pageCache.delete(pageCache.keys().next().value!);
    pageCache.set(item.link, { html, expiresAt: Date.now() + (html ? 600000 : 60000) });
  }
  if (html) {
    const product = parseRetailerProductPage(html, query);
    if (product) return {
      ...item, ...product, title: enrichListingTitle(product.title, item.title), priceSource: "retailer_page", checkedAt: new Date().toISOString(),
      snippet: `${product.title}. Retailer page structured INR offer: ₹${product.price.toLocaleString("en-IN")}. Availability: ${product.availability}.`,
    };
  }
  return item.price > 0 ? item : null;
}
