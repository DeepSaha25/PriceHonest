import { useMemo, useState } from "react";
import type { CheckDealResult } from "../lib/types";

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : "₹" + Math.round(n).toLocaleString("en-IN");

export function VerdictHeader({ result, onAddPrice }: { result: CheckDealResult; onAddPrice?: () => void }) {
  const copy = {
    market_overview: { title: 'Here’s the price comparison', color: 'text-white' },
    genuine_deal: { title: 'Your price is competitive', color: 'text-green-400' },
    inflated_discount: { title: 'The discount needs a closer look', color: 'text-amber-400' },
    not_actually_cheap: { title: 'You could pay less elsewhere', color: 'text-red-300' },
    insufficient_data: { title: 'Not enough prices to compare yet', color: 'text-zinc-200' },
  }[result.verdict];
  const hasComparison = result.sellers.length >= 2;
  return (
    <section className="deal-surface p-5 sm:p-6" aria-label="Price summary">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={`text-xl font-semibold ${copy.color}`}>{copy.title}</h2>
        <span className="text-xs text-zinc-400">{result.sellers.length} matching retailer{result.sellers.length === 1 ? '' : 's'}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-300">
        {result.verdict === 'market_overview' ? 'Prices below are for the same model. Start with the lowest listing, or add your offer price to check whether it’s a good deal.' : result.rationale}
      </p>
      {result.sellers.length > 0 && <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Lowest price found" value={fmt(result.cheapestSeller?.price)} hint={result.cheapestSeller?.name ?? 'Matching listing'} accent="green" />
        <Stat
          label="Typical retailer price"
          value={hasComparison ? fmt(result.medianPrice) : 'Not enough prices'}
          hint="Middle price across matching retailers"
        />
        <Stat
          label={result.product.claimedPrice ? 'Your offer price' : 'Retailers compared'}
          value={
            result.product.claimedPrice ? fmt(result.product.claimedPrice) : String(result.sellers.length)
          }
          hint={result.marketDiscountPercent == null ? 'Same model and specifications' : `${Math.abs(result.marketDiscountPercent)}% ${result.marketDiscountPercent >= 0 ? 'below' : 'above'} the typical price`}
        />
      </div>}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {result.cheapestSeller && <a href={result.cheapestSeller.link} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center rounded-xl bg-amber-400 px-4 py-3 text-center text-sm font-semibold text-black hover:bg-amber-300 sm:w-auto">View lowest at {result.cheapestSeller.name} ↗</a>}
        {!result.product.claimedPrice && hasComparison && onAddPrice && <button type="button" onClick={onAddPrice} className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm text-white hover:border-amber-400 sm:w-auto">Check my offer price</button>}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = "white",
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "white" | "green" | "amber";
}) {
  const color =
    accent === "green" ? "#22c55e" : accent === "amber" ? "#f59e0b" : "#f0f0f8";
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <div className="text-xs font-medium text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-xs leading-relaxed text-zinc-400">{hint}</div>
    </div>
  );
}

export function SourceCoverage({ result }: { result: CheckDealResult }) {
  if (!result.sources?.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-zinc-500">
      <span className="mr-1 uppercase tracking-widest text-zinc-600">
        Evidence coverage
      </span>
      {result.sources.map((source) => (
        <span
          key={source.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${source.status === "error" ? "bg-red-400" : source.status === "demo" ? "bg-amber-400" : source.status === "empty" ? "bg-zinc-600" : "bg-green-400"}`}
          />
          {source.label} · {source.count}
        </span>
      ))}
    </div>
  );
}

const priceSourceLabel = (seller: CheckDealResult['sellers'][number]) =>
  seller.priceSource === 'retailer_page' ? 'Read from the store page' : seller.priceSource === 'google_shopping' ? 'Found on Google Shopping' : seller.priceSource === 'demo' ? 'Demo price' : 'Found in Google search · confirm at checkout';

export function RetailerComparison({ result, onSelect }: { result: CheckDealResult; onSelect: (query: string) => void }) {
  const choosing = result.comparison?.status === 'needs_selection';
  const [family, setFamily] = useState('All models');
  const variants = result.comparison?.variants ?? [];
  const families = [...new Set(variants.map((variant) => variant.title.split(' · ')[0]))];
  if (choosing) return (
    <section className="deal-surface p-5 sm:p-6" aria-label="Choose a product model">
      <p className="text-xs font-medium uppercase tracking-wider text-amber-400">One quick choice</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Which model do you want?</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">“{result.product.title}” matches a few different versions. Choose yours so we compare the same product across stores.</p>
      {families.length > 1 && <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter models">
        {['All models', ...families].map((name) => <button key={name} type="button" aria-pressed={family === name} onClick={() => setFamily(name)} className={`rounded-lg border px-3 py-2 text-xs ${family === name ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-white/15 text-zinc-300 hover:border-white/40'}`}>{name}</button>)}
      </div>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {variants.filter((variant) => family === 'All models' || variant.title.split(' · ')[0] === family).map((variant) => {
          const [name, ...specs] = variant.title.split(' · ');
          return <button key={variant.id} type="button" onClick={() => onSelect(variant.query)} className="flex flex-col rounded-xl border border-white/15 bg-white/[0.025] p-4 text-left transition-colors hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
            <span className="text-base font-semibold text-white">{name}</span>
            {!!specs.length && <span className="mt-2 text-sm text-zinc-300">{specs.join(' · ')}</span>}
            <span className="mt-3 text-xs text-zinc-400">{variant.sellerCount} store{variant.sellerCount === 1 ? '' : 's'} found · prices from {fmt(variant.lowestPrice)}</span>
            <span className="mt-4 text-sm font-medium text-amber-400">Compare this model →</span>
          </button>;
        })}
      </div>
      <p className="mt-4 text-xs text-zinc-400">Not sure? Find the model, memory and storage on the product page, then use “Edit search” above.</p>
    </section>
  );
  const sorted = [...result.sellers].sort((a, b) => a.price - b.price);
  return (
    <section className="deal-surface p-5 sm:p-6" aria-label="Retailer price comparison">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Prices by store</h2>
        <span className="text-xs text-zinc-400">Lowest price first</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">Same model and specifications. Delivery and conditional discounts may change the checkout total.</p>
      {result.sellers.length > 0 && (
        <div className="mt-4 divide-y divide-white/10">
          {sorted.map((seller, index) => (
            <div key={seller.name} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">{seller.name}</span>
                  {seller.price === sorted[0]?.price && <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-400">Lowest price</span>}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{priceSourceLabel(seller)}</p>
                <details className="mt-2 text-xs text-zinc-400"><summary className="cursor-pointer hover:text-white">Listing details</summary><p className="mt-2 leading-relaxed">{seller.title}</p><p className="mt-1">{seller.availability === 'in_stock' ? 'Listed in stock' : 'Confirm stock at checkout'}{seller.delivery ? ` · ${seller.delivery}` : ''}</p></details>
              </div>
              <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:justify-start sm:gap-4">
                <strong className="text-lg text-white">{fmt(seller.price)}</strong>
                <a href={seller.link} target="_blank" rel="noopener noreferrer" aria-label={`View product at ${seller.name}`} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-amber-400 hover:border-amber-400">Visit store ↗</a>
              </div>
            </div>
          ))}
        </div>
      )}
      {!choosing && !result.sellers.length && <p className="mt-4 text-sm text-zinc-300">No matching product prices were found. Include the exact model and specifications, or use a product-page link.</p>}
      <p className="mt-4 border-t border-white/10 pt-4 text-xs text-zinc-400">{result.mode === 'demo' ? 'Offline demo prices.' : `Checked ${new Date(result.evidenceObservedAt ?? result.checkedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}${result.fromCache ? ' · recently saved search' : ''}.`} Confirm the final price at checkout.</p>
    </section>
  );
}

export function SearchDetails({ result }: { result: CheckDealResult }) {
  return <details className="deal-surface p-5 text-sm text-zinc-300">
    <summary className="cursor-pointer font-medium text-white">Sources & search details</summary>
    <div className="mt-4 space-y-4">
      <p>Comparison confidence: <strong>{result.confidence}</strong>. {result.excludedCount} unsuitable or duplicate listings were excluded.</p>
      <SourceCoverage result={result} />
      <div className="grid gap-2 sm:grid-cols-2">{result.retailers?.map((store) => <a key={store.id} href={store.searchUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/10 p-3 text-xs hover:border-amber-400/50"><span className="font-medium text-white">{store.name} ↗</span><span className="mt-1 block text-zinc-400">{store.count ? 'Matching price found' : store.status === 'error' ? 'Search unavailable' : 'No matching price found'}</span></a>)}</div>
      {!!result.warnings.length && <ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed text-zinc-400">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      <p className="text-xs text-zinc-400">Sources checked {new Date(result.evidenceObservedAt ?? result.checkedAt).toLocaleString('en-IN')}. {result.fromCache ? 'Evidence is cached for up to 10 minutes. Refresh prices to check again.' : ''}</p>
    </div>
  </details>;
}

export function ReportActions({ result }: { result: CheckDealResult }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = result.comparison?.status === 'needs_selection' ? `PriceHonest found multiple models for ${result.product.title}. Choose a model to compare its prices.` : `PriceHonest for ${result.product.title}: ${result.cheapestSeller ? `Lowest found ${fmt(result.cheapestSeller.price)} at ${result.cheapestSeller.name}.` : 'Not enough matching prices found.'}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard permissions are optional */
    }
  };
  const download = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pricehonest-${result.product.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 transition hover:border-amber-500/40 hover:text-white"
      >
        {copied ? "✓ Copied" : "Copy summary"}
      </button>
      <button
        type="button"
        onClick={download}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 transition hover:border-amber-500/40 hover:text-white"
      >
        ↓ Download JSON
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 transition hover:border-amber-500/40 hover:text-white"
      >
        Print report
      </button>
    </div>
  );
}

export function PriceScenario({ result }: { result: CheckDealResult }) {
  const [price, setPrice] = useState(
    result.product.claimedPrice ? String(result.product.claimedPrice) : "",
  );
  const [delivery, setDelivery] = useState("0");
  const [coupon, setCoupon] = useState("0");
  const effective =
    Number(price || 0) + Number(delivery || 0) - Number(coupon || 0);
  const median = result.medianPrice ?? 0;
  const marketDelta =
    median > 0 && effective > 0
      ? Math.round(((median - effective) / median) * 100)
      : null;
  const saved =
    result.cheapestSeller?.price && effective > 0
      ? Math.max(0, Math.round(effective - result.cheapestSeller.price))
      : null;
  const label = useMemo(
    () =>
      marketDelta == null
        ? "Enter a price to test it"
        : marketDelta >= 0
          ? `${marketDelta}% below market median`
          : `${Math.abs(marketDelta)}% above market median`,
    [marketDelta],
  );
  if (result.comparison?.status === 'needs_selection' || result.sellers.length < 2) return null;
  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
            Price calculator
          </div>
          <h3 className="mt-1 text-lg font-semibold text-white">
            Include delivery or a coupon
          </h3>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-zinc-500">
          Test delivery fees or a coupon without changing the live evidence
          above.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[10px] uppercase tracking-widest text-zinc-500">
          Offer price
          <input
            aria-label="Scenario offer price"
            type="number"
            min="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="₹ price"
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
          />
        </label>
        <label className="text-[10px] uppercase tracking-widest text-zinc-500">
          Delivery
          <input
            aria-label="Scenario delivery fee"
            type="number"
            min="0"
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
          />
        </label>
        <label className="text-[10px] uppercase tracking-widest text-zinc-500">
          Coupon
          <input
            aria-label="Scenario coupon amount"
            type="number"
            min="0"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
        <div>
          <span className="text-xs text-zinc-500">
            Effective checkout price
          </span>
          <strong className="ml-3 text-lg text-white">
            {effective > 0 ? fmt(effective) : "—"}
          </strong>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span
            className={
              marketDelta != null && marketDelta >= 0
                ? "text-green-400"
                : "text-amber-400"
            }
          >
            {label}
          </span>
          {saved != null && saved > 0 && (
            <span className="text-zinc-500">
              ₹{saved.toLocaleString("en-IN")} over lowest
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
