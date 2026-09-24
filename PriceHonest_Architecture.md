# PriceHonest — evidence-first architecture

## Product thesis

A retailer’s discount percentage is a claim, not proof. PriceHonest asks the market around a product what the price actually looks like, shows the sources, and refuses to call something a deal when the evidence is thin.

## System shape

```text
Browser (React + TypeScript + Vite)
  Landing → Investigator → streamed report
                         ├─ seller comparison
                         ├─ evidence receipts + limitations
                         ├─ scenario calculator
                         └─ local saved targets / compare

Express + TypeScript
  /api/resolve-product
  /api/check-deal
  /api/check-deal/stream (NDJSON)
       │
       ├── evidence-only TTL cache + in-flight deduplication
       ├── query/model/variant/currency/condition guardrails
       ├── deterministic verdict + rationale
       └── ignored first-party live observation snapshots
             │
             └── SerpApi
                 ├── Google Shopping
                 ├── retailer-restricted Google Search
                 └── dated Google Search context
```

## Why three SerpApi paths matter

### Google Shopping — market layer

`google_shopping` is used to find live comparable seller listings. The adapter retains title, price, source, link, rating and thumbnail when trustworthy. It rejects invalid links, foreign-currency ambiguity, invalid prices and the wrong product.

### Retailer-restricted Google Search — coverage layer

A second Google query covers Indian retailer domains that may not appear in the Shopping response. It only keeps prices that are unambiguous purchase prices; EMI, MRP, “from”, ranges and coupon-dependent numbers are excluded rather than silently treated as the deal price.

### Google Search — context layer

A one-year search query surfaces dated mentions. An amount becomes a historical signal only when the text contains a parseable INR amount and a valid past date. The UI calls these **dated contextual mentions**, never a complete historical record.

## Data lifecycle

1. The browser resolves a pasted URL into a readable product query. It rejects short/identifier-only URLs.
2. The server validates the query and optional INR claim values.
3. Live mode collects source evidence. Demo mode loads labelled local fixtures; it never falls through to live or silently becomes mock data.
4. Listings pass conservative model, variant, accessory, refurbished, currency and relevance filters.
5. Evidence is cached by `mode + normalized query`, not by verdict or user claim. A new offer price recomputes the verdict over the same source evidence.
6. `/api/check-deal/stream` emits the actual source stages over NDJSON. A disconnect cancels provider work where supported.
7. The deterministic engine returns verdict, confidence, concrete reasons, warnings, seller provenance, source statuses and a rationale grounded in retained data.
8. Live scans can append observed lowest/median/seller-count snapshots to ignored `.data/observations.json`. Demo observations are never mixed into that timeline.

## Verdict states

- **`genuine_deal`** — a supplied price is within the competitive band and close to the lowest relevant listing.
- **`inflated_discount`** — the “before” price materially exaggerates the current market discount, optionally supported by dated context.
- **`not_actually_cheap`** — the supplied price is materially above the market median or not among competitive listings.
- **`market_overview`** — no offer was supplied; the report describes the market without pretending to validate a deal.
- **`insufficient_data`** — fewer than two relevant seller listings or no usable evidence; the system refuses to guess.

Confidence reflects evidence volume. There are no fabricated honesty scores, synthetic radar axes, or invented historical points.

## Frontend flow

### Landing

The landing page leads with a visible example audit, then explains the market/claim/receipts split, the SerpApi method, FAQ, and a direct investigator entry. The example is explicitly marked illustrative/sample data.

### Investigator

The user can enter a product name or supported product URL, optional offer and original prices, and choose **Live** or clearly labelled **Demo** mode. Quick cases remove typing friction during a judging demo.

### Stream

The loading console mirrors the backend: identity → Shopping → retailers → context → analysis. It supports cancellation and never uses a fake timer to claim a provider finished.

### Report

The report provides:

- verdict and confidence;
- offer, market median, lowest seller and coverage metrics;
- source-linked seller comparison with listing titles and origin;
- deterministic reasons and a plain-language rationale;
- dated contextual evidence and warnings;
- a scenario lab for checkout fees, coupons and alternate offers;
- print, JSON download, share, target saving, and comparison tools.

## Operational choices

- SerpApi is server-side only.
- Demo mode is a judge-safe fallback, not a silent mock.
- JSON body and product query lengths are bounded.
- CORS is configurable.
- Provider errors are sanitized.
- Seller URLs are validated before they are rendered as links.
- Optional LLM credentials do not participate in correctness; the fallback rationale remains deterministic and source-grounded.

## Submission narrative

PriceHonest combines a clear consumer insight (discounts are easy to inflate) with meaningful search engineering (three evidence paths, filtering, provenance, caching and streaming). The result is useful because it does not only say “good” or “bad”: it shows the alternatives, the arithmetic, what the evidence cannot prove, and what the shopper can do next.
