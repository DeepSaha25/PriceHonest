const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

// Keep the suite offline even when a developer's repository .env has a key.
process.env.PRICEHONEST_SKIP_ENV = "true";
process.env.SERPAPI_KEY = "";
process.env.ENABLE_LLM = "false";

const { default: app } = require("../dist/index.js");
const {
  sanitizeProductQuery,
  assessListing,
  filterAndMatchListings,
} = require("../dist/services/validation.js");
const { parsePrice } = require("../dist/services/serpapiClient.js");
const cache = require("../dist/db/cache.js");

let server;
let baseUrl;

test.before(async () => {
  cache.clear();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("query sanitization preserves model identity and provider prices stay INR-only", () => {
  assert.match(sanitizeProductQuery("Sony WH-1000XM5 16 gb"), /WH-1000XM5/);
  assert.equal(parsePrice("$249"), 0);
  assert.equal(parsePrice("₹24,999"), 24999);
  assert.equal(parsePrice("INR 24,999"), 24999);
});

test("listing guards exclude accessories, refurbished items, and wrong models while preserving titles", () => {
  assert.equal(
    assessListing("Sony WH-1000XM5", "Sony WH-1000XM4").accepted,
    false,
  );
  assert.equal(
    assessListing("Sony WH-1000XM5", "Sony WH-1000XM5 replacement ear pads")
      .accepted,
    false,
  );
  assert.equal(
    assessListing("Sony WH-1000XM5", "Sony WH1000XM5 skins & wraps").accepted,
    false,
  );
  assert.equal(
    assessListing("Sony WH-1000XM5", "Refurbished Sony WH-1000XM5").accepted,
    false,
  );
  const result = filterAndMatchListings("Sony WH-1000XM5", [
    {
      title: "Sony WH-1000XM5 Wireless Headphones",
      price: 24999,
      source: "Amazon",
      link: "https://amazon.in/p/x",
      origin: "shopping",
    },
    {
      title: "Sony WH-1000XM5 replacement ear pads",
      price: 999,
      source: "Amazon",
      link: "https://amazon.in/p/a",
      origin: "shopping",
    },
  ]);
  assert.equal(result.sellers.length, 1);
  assert.equal(result.sellers[0].title, "Sony WH-1000XM5 Wireless Headphones");
  assert.equal(result.sellers[0].origin, "shopping");
});

test("demo mode is explicit, meaningful, and cache stores evidence rather than a verdict", async () => {
  const response = await fetch(`${baseUrl}/api/check-deal`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productQuery: "Sony WH-1000XM5",
      claimedPrice: 19999,
      claimedOriginalPrice: 34999,
      mode: "demo",
    }),
  });
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.equal(report.mode, "demo");
  assert.equal(report.product.claimedPrice, 19999);
  assert.ok(report.sellers.length >= 4);
  assert.ok(
    report.sellers.every(
      (seller) => seller.title && seller.origin && seller.match,
    ),
  );
  assert.ok(report.evidence.some((item) => item.snippet));
  assert.equal(report.observations.length, 0);
  assert.match(report.warnings.join(" "), /Demo mode/);

  const second = await (
    await fetch(`${baseUrl}/api/check-deal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productQuery: "Sony WH-1000XM5",
        claimedPrice: 29999,
        mode: "demo",
      }),
    })
  ).json();
  assert.equal(second.fromCache, true);
  assert.equal(second.product.claimedPrice, 29999);
  assert.notEqual(report.product.claimedPrice, second.product.claimedPrice);
});

test("live provider failure is honest and never becomes demo evidence", async () => {
  const response = await fetch(`${baseUrl}/api/check-deal`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productQuery: "Sony WH-1000XM5",
      claimedPrice: 19999,
      mode: "live",
      forceRefresh: true,
    }),
  });
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.equal(report.mode, "live");
  assert.equal(report.sellers.length, 0);
  assert.equal(report.verdict, "insufficient_data");
  assert.ok(report.sources.every((source) => source.status === "error"));
  assert.doesNotMatch(JSON.stringify(report), /Demo listing|PriceHistory/);
});

test("stream endpoint emits NDJSON progress and a result", async () => {
  const response = await fetch(`${baseUrl}/api/check-deal/stream`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productQuery: "wireless headphones",
      claimedPrice: 3999,
      mode: "demo",
      forceRefresh: true,
    }),
  });
  assert.equal(
    response.headers.get("content-type"),
    "application/x-ndjson; charset=utf-8",
  );
  const lines = (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.ok(
    lines.some((line) => line.type === "progress" && line.step === "shopping"),
  );
  assert.ok(
    lines.some(
      (line) =>
        line.type === "progress" &&
        line.step === "analysis" &&
        line.status === "done",
    ),
  );
  const result = lines.find((line) => line.type === "result");
  assert.equal(result.data.mode, "demo");
  assert.equal(result.data.product.title, "wireless headphones");
  assert.equal(result.data.sellers.length, 0);
  assert.equal(result.data.verdict, "insufficient_data");
});

test("resolve-product rejects short URLs without inventing identity", async () => {
  const response = await fetch(`${baseUrl}/api/resolve-product`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: "https://amzn.to/abc123" }),
  });
  assert.equal(response.status, 422);
  const readableShort = await fetch(`${baseUrl}/api/resolve-product`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: "https://bit.ly/sony-wh-1000xm5" }),
  });
  assert.equal(readableShort.status, 422);
});
