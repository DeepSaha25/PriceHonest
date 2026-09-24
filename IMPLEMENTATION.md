# PriceHonest — evidence-first upgrade

## Product direction
A premium, fast India-focused deal investigation workspace. Emerald, warm amber, graphite, fine grid, restrained animation; editorial typography and useful visuals, no arbitrary trust scores. Every price should link to a source. Unknowns are visible.

## API contract (frontend/backend implementation agreement)
Existing POST `/api/resolve-product` returns `{productQuery, sourceUrl?, platform?, warning?}`. Never fetch arbitrary user URLs. Keep model IDs like WH-1000XM5 intact. Unsupported short / identifier-only URLs should return 422 with useful instructions, not fabricate product identity.

POST `/api/check-deal`: `{productQuery:string, claimedPrice?:number, claimedOriginalPrice?:number, mode?:'live'|'demo', forceRefresh?:boolean}`.
POST `/api/check-deal/stream`: same body; `application/x-ndjson` response. Each line is `{type:'progress', step:'shopping'|'retailers'|'context'|'analysis', status:'running'|'done'|'error', message:string}` or `{type:'result', data:CheckDealResult}` or `{type:'error', error:string}`. Streams reflect actual work. Normal JSON route must also work.

CheckDealResult:
```
{
 id:string,
 product:{title:string,image:string|null,claimedPrice:number|null,claimedOriginalPrice:number|null},
 verdict:'genuine_deal'|'inflated_discount'|'not_actually_cheap'|'market_overview'|'insufficient_data',
 confidence:'high'|'medium'|'low',
 realDiscountPercent:number|null, // compatibility alias of advertisedDiscountPercent, NOT verified real savings
 advertisedDiscountPercent:number|null,
 marketDiscountPercent:number|null, // (median-claim)/median *100; signed
 savingsVsCheapest:number|null, // max(claim-cheapest,0)
 sellers:Array<{name:string,title:string,price:number,link:string,rating?:number,thumbnail?:string,origin:'shopping'|'retailer',match:'strong'|'possible',delivery?:string}>,
 cheapestSeller:SellerPrice|null,
 medianPrice:number|null,
 historicalSignals:Array<{source:string,mentionedPrice:number,date:string,url:string}>, // dated contextual mentions only, NOT a price history
 evidence:Array<{title:string,url:string,source:string,snippet:string,date?:string,mentionedPrice?:number}>,
 rationale:string,
 reasons:string[],
 warnings:string[],
 excludedCount:number,
 sources:Array<{id:'shopping'|'retailers'|'context',label:string,status:'success'|'empty'|'error'|'demo',count:number}>,
 observations:Array<{checkedAt:string,lowestPrice:number,medianPrice:number,sellerCount:number}>, // only real stored scans, unique timestamps, max 20; demo []
 fromCache:boolean,
 checkedAt:string,
 mode:'live'|'demo',
 analysisVersion:string
}
```

Price claims must be validated (finite positive amounts <= 10,000,000; original >= claim). Cache underlying evidence by normalized query, not final verdict, so changed claims always recompute. Avoid duplicate simultaneous upstream searches. Explicit demo mode must never be a silent live fallback. Live failure => honest degraded or insufficient-data result / actionable 503, never mock prices. No user price => `market_overview`, never genuine-deal. Rules are deterministic and shown as reasons. Currency is INR only.

GET `/api/health` returns existing `status`, `serpapi` loaded/missing, safe provider status, version.

## Frontend scope
- Landing: concise product narrative, functional search hero, interactive clearly labelled sample receipt, evidence/methodology sections, FAQ, connected CTAs.
- Workspace tabs: investigate, saved price targets (local only; refresh on demand, not background/email), compare up to three stored reports, methodology.
- User inputs product + optional offer/original prices; explicit live/demo switch.
- NDJSON progress + cancellation + inline recovery; no simulated completed stages.
- Report: unmistakable verdict, advertised vs market savings, seller cards with links/titles and origins, evidence snippets and limitations, real observed snapshots, scenario calculator via cached scans, print/JSON download/share search link.
- Local report persistence with safe storage handling and target alerts calculated on refresh.
- Responsive, keyboard accessible, reduced-motion support; lazy workspace route.

## Validation
Build both apps; backend automated tests of rules, matching, validation, URL parsing, cache; live smoke tests using current env; browser tests across desktop/mobile and interactive flows; document deployment and judging demo.
