const test = require("node:test");
const assert = require("node:assert/strict");
const { computeVerdict } = require("../dist/services/verdictEngine.js");

function sellers(prices) {
  return prices.map((price, index) => ({
    name: `Store ${index + 1}`,
    title: "Demo Product",
    price,
    link: `https://store${index + 1}.example/product`,
    origin: "shopping",
    match: "strong",
  }));
}

test("deterministic verdict engine exposes all five states and reasons", () => {
  assert.equal(
    computeVerdict({
      sellerPrices: sellers([100, 110, 120]),
      historicalMentions: [],
    }).verdict,
    "market_overview",
  );
  assert.equal(
    computeVerdict({
      claimedPrice: 90,
      sellerPrices: sellers([]),
      historicalMentions: [],
    }).verdict,
    "insufficient_data",
  );
  assert.equal(
    computeVerdict({
      claimedPrice: 80,
      claimedOriginalPrice: 100,
      sellerPrices: sellers([100, 110, 120]),
      historicalMentions: [],
    }).verdict,
    "genuine_deal",
  );
  assert.equal(
    computeVerdict({
      claimedPrice: 90,
      claimedOriginalPrice: 200,
      sellerPrices: sellers([100, 110, 120]),
      historicalMentions: [],
    }).verdict,
    "inflated_discount",
  );
  assert.equal(
    computeVerdict({
      claimedPrice: 140,
      sellerPrices: sellers([100, 110, 120]),
      historicalMentions: [],
    }).verdict,
    "not_actually_cheap",
  );
  for (const verdict of [
    computeVerdict({
      sellerPrices: sellers([100, 110]),
      historicalMentions: [],
    }),
    computeVerdict({
      claimedPrice: 100,
      sellerPrices: sellers([100, 110]),
      historicalMentions: [],
    }),
  ])
    assert.ok(verdict.reasons.length > 0);
});
