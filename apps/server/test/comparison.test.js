const test = require("node:test");
const assert = require("node:assert/strict");
process.env.PRICEHONEST_SKIP_ENV = "true";
process.env.SERPAPI_KEY = "";

const { assessListing, filterAndMatchListings, discoveryListingMatches, enrichListingTitle } = require("../dist/services/validation");
const { parseShoppingRows, parseRetailerRows, parseImmersiveProductRows } = require("../dist/services/serpapiClient");
const { parseRetailerProductPage } = require("../dist/services/retailerPageClient");
const { retailerForUrl, isRetailerProductUrl } = require("../dist/services/retailers");
const { createCheckDealResult } = require("../dist/routes/checkDeal");
const { computeVerdict } = require("../dist/services/verdictEngine");

const pro = "Apple MacBook Pro M5 14.2-inch 16GB Unified Memory 512GB SSD Silver";
const air = "Apple MacBook Air M5 13.6-inch 16GB Unified Memory 512GB SSD Silver";
function listing(title, price, domain = "amazon.in", extra = {}) {
  return { title, price, source: "Amazon", link: `https://${domain}/product/p/123456`, origin: "retailer", priceSource: "search_index", ...extra };
}

test("MacBook M5 never matches a cheap book, guide, bag, accessory, or old generation", () => {
  for (const title of [
    "The Complete MacBook Pro M5 User Guide for Beginners", "MacBook M5 Handbook Paperback",
    "MacBook M5 Laptop Bag", "MacBook Pro M5 replacement keyboard", "MacBook M5 Hard Case",
    "Compatible with MacBook M5", "Apple MacBook Pro M4 16GB 512GB", "Apple MacBook Pro M5 Max 16GB 512GB",
  ]) assert.equal(assessListing("MacBook M5", title).accepted, false, title);
  assert.equal(assessListing("MacBook M5", pro).accepted, true);
  assert.equal(assessListing("MacBook M5", air).accepted, true);
  const result = filterAndMatchListings("MacBook M5", [listing("MacBook M5 Handbook", 499), listing(pro, 499), listing(pro, 169900, "croma.com")]);
  assert.equal(result.sellers.length, 1);
  assert.equal(result.sellers[0].price, 169900);
});

test("Air/Pro, chip editions, screen, memory and storage are not mixed into one median", () => {
  const rows = [listing(pro, 169900), listing(pro, 165900, "croma.com"), listing(air, 119900, "flipkart.com"), listing(pro.replace("16GB", "24GB"), 189900, "reliancedigital.in")];
  const broad = filterAndMatchListings("MacBook M5", rows);
  assert.equal(broad.comparison.status, "needs_selection");
  assert.equal(broad.comparison.variants.length, 3);
  assert.equal(broad.sellers.length, 0);
  const selected = broad.comparison.variants.find((variant) => variant.sellerCount === 2);
  const exact = filterAndMatchListings(selected.query, rows);
  assert.equal(exact.comparison.status, "ready");
  assert.deepEqual(exact.sellers.map((seller) => seller.price), [165900, 169900]);
  assert.equal(assessListing("MacBook Pro M5 14-inch 16GB RAM 512GB SSD", pro.replace("16GB Unified Memory 512GB SSD", "512GB RAM 16GB SSD")).accepted, false);
  assert.equal(assessListing("MacBook Pro M5 Pro", pro).accepted, false);
  assert.equal(assessListing("MacBook Air M5", pro).accepted, false);
  assert.equal(assessListing("MacBook Pro M5 14-inch 16GB 1TB", pro.replace("512GB", "1024GB")).accepted, true);
});

test("truncated cards can be verified, but missing or explicitly wrong specs never become comparable quotes", () => {
  const query = "MacBook Air M5 13-inch 16GB 512GB";
  const truncated = "Apple MacBook Air M5 16GB 512GB";
  assert.equal(discoveryListingMatches(query, truncated), true);
  assert.equal(assessListing(query, truncated).accepted, false);
  assert.equal(discoveryListingMatches(query, truncated.replace("16GB", "24GB")), false);
  assert.equal(discoveryListingMatches(query, truncated.replace("M5", "M4")), false);
  const enriched = enrichListingTitle(truncated, "13.6-inch Liquid Retina display");
  assert.equal(assessListing(query, enriched).accepted, true);
  assert.equal(assessListing(query, 'MacBook Air 13″ M5 16GB memory 512GB storage').accepted, true);
  assert.equal(assessListing(query, 'MacBook Air 13′′ M5 16GB memory 512GB storage').accepted, true);
  assert.equal(filterAndMatchListings(query, [listing(truncated, 119900)]).sellers.length, 0);
  const marketing = enrichListingTitle('Apple 2026 MacBook Air 13″ Laptop with M5 chip', '16GB Unified Memory, TB SSD Storage, up to 18 hours of battery life and fast SSD storage starting from 512GB');
  assert.equal(filterAndMatchListings(query, [listing(marketing, 172490)]).sellers.length, 0);
});

test("phone storage, editions and AirPods generations remain separate configurations", () => {
  const phones = filterAndMatchListings("Samsung Galaxy S24", [listing("Samsung Galaxy S24 8GB RAM 128GB storage", 50000), listing("Samsung Galaxy S24 8GB RAM 256GB storage", 55000, "croma.com"), listing("Samsung Galaxy S24 Ultra 12GB RAM 256GB storage", 80000, "flipkart.com")]);
  assert.equal(phones.comparison.status, "needs_selection");
  assert.equal(phones.comparison.variants.length, 2);
  assert.equal(assessListing("Samsung Galaxy S24 128GB", "Samsung Galaxy S24 256GB").accepted, false);
  const airpods = filterAndMatchListings("Apple AirPods Pro", [listing("Apple AirPods Pro 2nd Generation", 19000), listing("Apple AirPods Pro 3rd Generation", 24000, "croma.com")]);
  assert.equal(airpods.comparison.status, "needs_selection");
  const choice = airpods.comparison.variants[0];
  assert.equal(filterAndMatchListings(choice.query, [listing("Apple AirPods Pro 2nd Generation", 19000), listing("Apple AirPods Pro 3rd Generation", 24000, "croma.com")]).sellers.length, 1);
});

test("missing configuration, unavailable stock and untrusted or spoofed retailers are excluded", () => {
  const result = filterAndMatchListings("MacBook M5", [
    listing("Apple MacBook Pro M5", 169900), listing(pro, 169900, "amazon.in.evil.example"),
    listing(pro, 169900, "unknown.example"), listing(pro, 169900, "flipkart.com", { availability: "out_of_stock" }),
    listing(pro, 168900, "croma.com"),
  ]);
  assert.equal(result.sellers.length, 1);
  assert.equal(result.sellers[0].name, "Croma");
  assert.equal(retailerForUrl("https://fakeamazon.in/dp/B012345678"), undefined);
  assert.equal(retailerForUrl("https://apple.com/us/shop/buy-mac/macbook-pro"), undefined);
  assert.equal(isRetailerProductUrl("https://amazon.in/macbook-m5/s?k=macbook+m5"), false);
  assert.equal(isRetailerProductUrl("https://croma.com/unboxed/macbook-m5-deal"), false);
  assert.equal(isRetailerProductUrl("https://reliancedigital.in/collection/macbook-m5"), false);
  assert.equal(isRetailerProductUrl("https://www.vijaysales.com/p/P258900/258897/apple-macbook-air-m5/abc"), true);
  assert.equal(isRetailerProductUrl("https://www.jiomart.com/product/apple-macbook-air-m5-123"), true);
});

test("retailer quotes are canonical, deduplicated and prefer page prices over stale cheaper index entries", () => {
  const result = filterAndMatchListings("Sony WH-1000XM5", [
    listing("Sony WH-1000XM5", 20000),
    listing("Sony WH1000XM5", 24990, "www.amazon.in", { priceSource: "retailer_page" }),
    listing("Sony WH-1000XM5", 25990, "flipkart.com"),
  ]);
  assert.equal(result.sellers.length, 2);
  assert.equal(result.sellers[0].name, "Amazon");
  assert.equal(result.sellers[0].price, 24990);
});

test("Shopping offers require INR and actual retailer product links, not a self-reported Amazon label", () => {
  const link = "https://www.amazon.in/dp/B09XS7JWHH";
  const result = parseShoppingRows([
    { title: "Sony WH-1000XM5", price: "₹24,990", source: "Amazon", product_link: "https://google.com/search?q=sony", link },
    { title: "Sony WH-1000XM5", price: "$249", source: "Amazon", link },
    { title: "Sony WH-1000XM5", extracted_price: 24990, source: "Amazon", link },
    { title: "Sony WH-1000XM5", price: "₹24,990+", link },
    { title: "Sony WH-1000XM5", price: "₹24,990", source: "Amazon", link: "https://fake-store.example/product" },
  ]);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].link, link);
  const popup = parseImmersiveProductRows({ product_results: { title: "Sony WH-1000XM5", stores: [{ name: "Amazon", link, price: "₹25,990", details_and_offers: ["In stock online"] }] } });
  assert.equal(popup.items.length, 1);
  assert.equal(popup.items[0].price, 25990);
});

test("structured retailer prices accept the rupee currency while MRP, EMI, ranges and categories cannot supply prices", () => {
  const link = "https://www.croma.com/apple-macbook-pro-m5/p/123456";
  const result = parseRetailerRows([
    { title: pro, link, snippet: "MRP ₹1,89,900, EMI ₹5,990", rich_snippet: { top: { detected_extensions: { price: 169900, currency: "₹" }, extensions: ["₹1,69,900", "In stock"] } } },
    { title: pro, link, snippet: "MRP ₹1,89,900" },
    { title: pro, link, snippet: "Pay ₹5,990 per month" },
    { title: pro, link, snippet: "From ₹1,69,900 to ₹1,99,900" },
    { title: pro, link, snippet: "Shipping charges ₹199" },
    { title: pro, link, snippet: "Save ₹10000 with a bank offer" },
    { title: pro, link: "https://www.amazon.in/macbook-m5/s?k=macbook+m5", snippet: "₹1,69,900" },
  ]);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].price, 169900);
});

function page(product) { return `<html><script type="application/ld+json">${JSON.stringify(product)}</script></html>`; }
const product = (overrides = {}) => ({ "@type": "Product", name: pro, offers: { "@type": "Offer", price: 169900, priceCurrency: "INR", availability: "https://schema.org/InStock" }, ...overrides });

test("retailer page extraction associates prices with the right product, currency and configuration", () => {
  assert.equal(parseRetailerProductPage(page({ "@graph": [product()] }), "MacBook M5").price, 169900);
  assert.equal(parseRetailerProductPage(page(product()), "MacBook Pro M5 24GB"), null);
  assert.equal(parseRetailerProductPage(page(product({ name: "MacBook M5 User Guide", offers: { price: 499, priceCurrency: "INR" } })), "MacBook M5"), null);
  assert.equal(parseRetailerProductPage(page(product({ offers: { price: 1699, priceCurrency: "USD" } })), "MacBook M5"), null);
  assert.equal(parseRetailerProductPage(page(product({ offers: [{ price: 169900, priceCurrency: "INR" }, { price: 199900, priceCurrency: "INR" }] })), "MacBook M5"), null);
  assert.equal(parseRetailerProductPage(page(product({ offers: { "@type": "AggregateOffer", lowPrice: 1000, highPrice: 999999, priceCurrency: "INR" } })), "MacBook M5"), null);
  assert.equal(parseRetailerProductPage(page(product({ offers: { price: 169900, priceCurrency: "INR", availability: "https://schema.org/OutOfStock" } })), "MacBook M5").availability, "out_of_stock");
});

test("a search with only irrelevant cheap evidence returns insufficient data with no invented comparison", async () => {
  const evidence = { query: "MacBook M5", mode: "live", shopping: { status: "success", items: [listing("MacBook M5 User Guide", 499)] }, retailers: { status: "empty", items: [] }, context: { status: "success", items: [{ title: "MacBook M4 price", link: "https://news.example/old", snippet: "MacBook M4 price ₹10000 on 2025-01-01", date: "2025-01-01" }] } };
  const result = await createCheckDealResult({ productQuery: "MacBook M5", mode: "live", forceRefresh: false }, evidence, false);
  assert.equal(result.verdict, "insufficient_data");
  assert.equal(result.cheapestSeller, null);
  assert.equal(result.medianPrice, null);
  assert.equal(result.historicalSignals.length, 0);
});

test("dated context must match the selected configuration, even when the original query was broad", async () => {
  const evidence = { query: "MacBook M5", mode: "live", shopping: { status: "empty", items: [] }, retailers: { status: "success", items: [listing(air, 139490, "croma.com"), listing(air, 149900, "vijaysales.com")] }, context: { status: "success", items: [{ title: pro + " price", link: "https://news.example/pro", snippet: "MacBook Pro M5 was ₹129900 on 2025-12-01", date: "2025-12-01" }] } };
  const result = await createCheckDealResult({ productQuery: "MacBook M5", mode: "live", forceRefresh: false }, evidence, false);
  assert.equal(result.comparison.status, "ready");
  assert.equal(result.historicalSignals.length, 0);
});

test("real discount means savings against the comparable market, not the advertised MRP", () => {
  const result = computeVerdict({ claimedPrice: 90000, claimedOriginalPrice: 180000, sellerPrices: [listing(pro, 100000, "amazon.in", { match: "strong" }), listing(pro, 110000, "croma.com", { match: "strong" })], historicalMentions: [] });
  assert.equal(result.advertisedDiscountPercent, 50);
  assert.equal(result.realDiscountPercent, 14.3);
  assert.equal(computeVerdict({ sellerPrices: [], historicalMentions: [] }).verdict, "insufficient_data");
});
