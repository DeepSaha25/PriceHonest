const test = require("node:test");
const assert = require("node:assert/strict");
process.env.PRICEHONEST_SKIP_ENV = "true";
process.env.SERPAPI_KEY = "offline-test-key";
const axios = require("axios");
const { searchMajorRetailersDetailed, searchShoppingDetailed } = require("../dist/services/serpapiClient");
const { retailersForQuery, isRetailerProductUrl } = require("../dist/services/retailers");
const { filterAndMatchListings } = require("../dist/services/validation");

const title = "Sony WH-1000XM5 Wireless Noise Cancelling Headphones";
const links = {
  "amazon.in": "https://www.amazon.in/Sony-WH-1000XM5/dp/B09XS7JWHH",
  "flipkart.com": "https://www.flipkart.com/sony-wh-1000xm5/p/itm123abc",
  "croma.com": "https://www.croma.com/sony-wh-1000xm5/p/123456",
  "reliancedigital.in": "https://www.reliancedigital.in/sony-wh-1000xm5/p/123456",
  "vijaysales.com": "https://www.vijaysales.com/p/P123456/123456/sony-wh-1000xm5/abc",
  "tatacliq.com": "https://www.tatacliq.com/sony-wh-1000xm5/p-mp000123456",
  "jiomart.com": "https://www.jiomart.com/product/sony-wh-1000xm5-123456",
  "sony.co.in": "https://electronics.sony.co.in/products/wh-1000xm5",
  "shopatsc.com": "https://shopatsc.com/products/wh-1000xm5",
};

test("every intended retailer is searched independently; actual page prices replace indexed quotes", async (t) => {
  const searched = [];
  let active = 0;
  let maximum = 0;
  t.mock.method(axios, "get", async (url, options) => {
    if (url === "https://serpapi.com/search.json") {
      const domain = options.params.as_sitesearch;
      searched.push(domain);
      assert.equal(options.params.tbs, "li:1");
      assert.equal(options.params.q, "Sony WH-1000XM5");
      assert.equal(options.params.no_cache, "true");
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
      return { data: { search_metadata: { status: "Success" }, organic_results: [
        { title, link: links[domain], snippet: "MRP ₹34,990", rich_snippet: { top: { detected_extensions: { price: 24990, currency: "₹" }, extensions: ["₹24,990", "In stock"] } } },
        { title: "Sony WH-1000XM5 Handbook", link: links[domain], snippet: "₹499" },
      ] } };
    }
    assert.ok(isRetailerProductUrl(url));
    return { status: 200, headers: { "content-type": "text/html" }, data: `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: title, offers: { "@type": "Offer", price: 25990, priceCurrency: "INR", availability: "https://schema.org/InStock" } })}</script>` };
  });
  const result = await searchMajorRetailersDetailed("Sony WH-1000XM5", undefined, true);
  assert.deepEqual(searched.sort(), retailersForQuery("Sony WH-1000XM5").map((store) => store.domain).sort());
  assert.ok(maximum <= 4);
  assert.ok(result.items.length >= 5);
  assert.ok(result.items.every((item) => item.price === 25990 && item.priceSource === "retailer_page"));
  assert.ok(result.coverage.every((store) => store.status === "success"));
});

test("an individual store/provider failure remains visible while other stores still supply prices", async (t) => {
  t.mock.method(axios, "get", async (url, options) => {
    if (url !== "https://serpapi.com/search.json") throw new Error("Retailer page unavailable");
    const domain = options.params.as_sitesearch;
    if (domain === "croma.com") return { data: { error: "Private provider error mentioning offline-test-key" } };
    return { data: { search_metadata: { status: "Success" }, organic_results: [{ title, link: links[domain], rich_snippet: { top: { detected_extensions: { price: 24990, currency: "₹" }, extensions: ["₹24,990", "In stock"] } } }] } };
  });
  const result = await searchMajorRetailersDetailed("Sony WH-1000XM5", undefined, true);
  assert.equal(result.status, "success");
  assert.equal(result.coverage.find((store) => store.id === "croma").status, "error");
  assert.ok(result.items.length >= 5);
  assert.doesNotMatch(JSON.stringify(result), /offline-test-key|Private provider error/);
});

test("Shopping popup discovery resolves actual trusted offers and rejects book and impostor prices", async (t) => {
  const engines = [];
  t.mock.method(axios, "get", async (_url, options) => {
    engines.push(options.params.engine);
    if (options.params.engine === "google_shopping") return { data: { shopping_results: [
      { title, price: "₹24,990", product_link: "https://www.google.com/search?q=sony", immersive_product_page_token: "headphone-token" },
      { title: "Sony WH-1000XM5 User Guide", price: "₹499", immersive_product_page_token: "book-token" },
    ] } };
    assert.equal(options.params.page_token, "headphone-token");
    return { data: { product_results: { title, stores: [
      { name: "Amazon", title, link: links["amazon.in"], price: "₹24,990", details_and_offers: ["In stock online"] },
      { name: "Flipkart", title, link: links["flipkart.com"], price: "₹25,990" },
      { name: "Amazon", title, link: "https://fake-amazon.example/item", price: "₹499" },
    ] } } };
  });
  const result = await searchShoppingDetailed("Sony WH-1000XM5");
  assert.equal(result.items.length, 2);
  assert.deepEqual(engines, ["google_shopping", "google_immersive_product"]);
  assert.equal(filterAndMatchListings("Sony WH-1000XM5", result.items.map((item) => ({ ...item, origin: "shopping" }))).sellers.length, 2);
});

test("a genuine provider no-results response is empty evidence, not an outage or fixture", async (t) => {
  t.mock.method(axios, "get", async () => ({ data: { search_metadata: { status: "Success" }, error: "Google hasn't returned any results for this query." } }));
  const result = await searchShoppingDetailed("Missing Exact Product");
  assert.equal(result.status, "empty");
  assert.deepEqual(result.items, []);
});
