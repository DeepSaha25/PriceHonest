import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveProduct, checkDealStream } from '../lib/api';
import type { CheckDealResult, ProgressEvent, ProgressStep } from '../lib/types';
import { PriceScenario, ReportActions, RetailerComparison, SearchDetails, VerdictHeader } from '../components/DealTools';

const NebulaBackground = lazy(() => import('../components/ui/NebulaBackground').then((module) => ({ default: module.NebulaBackground })));
const EmeraldHorizonBg = lazy(() => import('../components/ui/EmeraldHorizonBg').then((module) => ({ default: module.EmeraldHorizonBg })));
const BrutalistBentoCharts = lazy(() => import('../components/BrutalistCharts'));

type Step = 'input' | 'loading' | 'result';
type Intent = 'compare' | 'check';
interface Draft { input: string; claimedPrice?: number; claimedOriginalPrice?: number; intent?: Intent }
const primary = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400';
const secondary = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-white/40 hover:text-white';
const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const examples = ['MacBook M5', 'Sony WH-1000XM5', 'Samsung Galaxy S24', 'Apple AirPods Pro'];

function FlowSteps({ current }: { current: number }) {
  return <ol className="mx-auto flex w-full max-w-lg flex-wrap justify-between gap-x-2 gap-y-3 px-3 py-4 text-xs sm:justify-center sm:gap-6 sm:px-4 sm:py-5" aria-label="Comparison steps">
    {['Find product', 'Match model', 'Compare prices'].map((label, index) => <li key={label} aria-current={index === current ? 'step' : undefined} className={`flex items-center gap-2 ${index === current ? 'text-amber-300' : index < current ? 'text-zinc-300' : 'text-zinc-500'}`}>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${index === current ? 'border-amber-400/60 bg-amber-400/10' : 'border-white/15'}`}>{index < current ? '✓' : index + 1}</span>
      <span>{label}</span>
    </li>)}
  </ol>;
}

function InputScreen({ draft, error, onSubmit, onBack }: { draft: Draft; error: string | null; onSubmit: (input: string, offer?: number, original?: number) => void; onBack?: () => void }) {
  const [input, setInput] = useState(draft.input);
  const [intent, setIntent] = useState<Intent>(draft.intent ?? (draft.claimedPrice ? 'check' : 'compare'));
  const [offer, setOffer] = useState(draft.claimedPrice?.toString() ?? '');
  const [original, setOriginal] = useState(draft.claimedOriginalPrice?.toString() ?? '');
  const [validation, setValidation] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  return <main className="mx-auto w-full max-w-2xl px-3 pb-12 pt-4 sm:px-4 sm:pt-8">
    <div className="mb-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-400">Check a deal</p>
      <h1 id="deal-page-title" tabIndex={-1} className="mt-3 text-3xl font-semibold tracking-tight text-white outline-none sm:text-4xl">Find the right price.</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-300">Compare the same product across trusted stores, or check the offer you’re looking at.</p>
    </div>
    <form className="deal-surface p-4 sm:p-7" onSubmit={(event) => {
      event.preventDefault();
      setValidation(null);
      const price = intent === 'check' ? Number(offer) : undefined;
      const reference = intent === 'check' && original ? Number(original) : undefined;
      if (reference !== undefined && price !== undefined && reference < price) { setValidation('The original price must be at least as much as your offer price.'); return; }
      if (input.trim()) onSubmit(input.trim(), price, reference);
    }}>
      <div role="group" aria-label="What would you like to do?" className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-black/35 p-1">
        {([['compare', 'Compare prices'], ['check', 'Check my deal']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={intent === value} onClick={() => { setIntent(value); setValidation(null); }} className={`min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${intent === value ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>{label}</button>)}
      </div>
      <label htmlFor="product-input" className="text-sm font-medium text-white">Product name or product link</label>
      <textarea ref={inputRef} id="product-input" name="product" value={input} required maxLength={4096} rows={2} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
      }} placeholder="e.g. MacBook M5, or paste a store’s product link" aria-describedby="product-help" className="deal-input mt-2 resize-y text-sm" />
      <p id="product-help" className="mt-2 text-xs leading-relaxed text-zinc-400">Know the exact model? Add the size, RAM and storage. Otherwise, we’ll help you choose.</p>
      {intent === 'check' && <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="offer-price" className="text-sm font-medium text-white">Your offer price (₹)</label>
          <input id="offer-price" type="number" inputMode="decimal" required min="1" max="10000000" step="0.01" value={offer} onChange={(event) => setOffer(event.target.value)} placeholder="e.g. 139490" className="deal-input mt-2 text-sm" aria-describedby="offer-help" />
          <p id="offer-help" className="mt-2 text-xs text-zinc-400">The price you would actually pay for this product.</p>
        </div>
        <details open={original ? true : undefined} className="text-sm text-zinc-300">
          <summary className="cursor-pointer py-1 hover:text-white">Check an advertised discount <span className="text-xs text-zinc-500">(optional)</span></summary>
          <label htmlFor="original-price" className="mt-3 block text-xs text-zinc-400">Original or crossed-out price (₹)</label>
          <input id="original-price" type="number" min={offer || '1'} max="10000000" step="0.01" value={original} onChange={(event) => setOriginal(event.target.value)} placeholder="e.g. 169900" className="deal-input mt-2 text-sm" />
        </details>
      </div>}
      {(validation || error) && <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm leading-relaxed text-red-200">{validation || error}</p>}
      <button id="check-deal-btn" type="submit" disabled={!input.trim()} className={`${primary} mt-6 w-full`}>{intent === 'check' ? 'Check my deal' : 'Compare prices'} <span aria-hidden="true" className="ml-2">→</span></button>
      <p className="mt-3 text-center text-xs text-zinc-400">Amazon · Flipkart · Croma · Reliance Digital · Vijay Sales & more</p>
    </form>
    <div className="mt-6">
      <p className="mb-3 text-center text-xs text-zinc-400">Try a product</p>
      <div className="flex flex-wrap justify-center gap-2">{examples.map((query) => <button key={query} type="button" onClick={() => { setInput(query); inputRef.current?.focus(); }} className="min-h-10 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs text-zinc-300 hover:border-amber-400/60 hover:text-white">{query}</button>)}</div>
    </div>
    {onBack && <button type="button" onClick={onBack} className="mx-auto mt-6 block py-2 text-sm text-zinc-300 hover:text-white">← Back to results</button>}
  </main>;
}

function LoadingScreen({ query, progress, identified, onCancel }: { query: string; progress: Partial<Record<ProgressStep, ProgressEvent>>; identified: boolean; onCancel: () => void }) {
  const groups = [
    { label: 'Find your product', done: identified, running: !identified, failed: false },
    { label: 'Search trusted stores', done: ['shopping', 'retailers'].every((id) => progress[id as ProgressStep]?.status === 'done' || progress[id as ProgressStep]?.status === 'error'), running: identified && ['shopping', 'retailers'].some((id) => progress[id as ProgressStep]?.status === 'running'), failed: progress.shopping?.status === 'error' && progress.retailers?.status === 'error' },
    { label: 'Match models & compare prices', done: progress.analysis?.status === 'done', running: progress.analysis?.status === 'running', failed: progress.analysis?.status === 'error' },
  ];
  return <main className="mx-auto w-full max-w-xl px-3 py-10 sm:px-4 sm:py-16">
    <section className="deal-surface p-4 sm:p-8" aria-busy="true">
      <h1 id="deal-page-title" tabIndex={-1} className="text-2xl font-semibold text-white outline-none">Finding matching prices…</h1>
      <p className="mt-3 break-words text-sm text-zinc-300">{query}</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">We check the model and specifications so an accessory or a different version doesn’t slip into your comparison.</p>
      <ol className="mt-6 space-y-4" aria-label="Search progress">{groups.map((group) => <li key={group.label} className="flex items-center justify-between gap-3 text-sm">
        <span className={`flex items-center gap-3 ${group.running || group.done ? 'text-zinc-200' : 'text-zinc-500'}`}><span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${group.done ? 'border-green-500/30 text-green-400' : 'border-white/15'}`}>{group.done ? '✓' : group.running ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" /> : '·'}</span>{group.label}</span>
        <span className="shrink-0 text-xs text-zinc-400">{group.failed ? 'Limited' : group.done ? 'Done' : group.running ? 'Checking' : 'Waiting'}</span>
      </li>)}</ol>
      <p role="status" aria-live="polite" className="mt-6 text-xs text-zinc-400">{progress.analysis?.status === 'running' ? 'Building your comparison.' : identified ? 'Some stores take a little longer. You can keep this tab open.' : 'Reading the product name.'}</p>
      <details className="mt-4 text-xs text-zinc-400"><summary className="cursor-pointer">Show search activity</summary><ul className="mt-3 space-y-2">{Object.values(progress).map((event) => <li key={event.step}>{event.message}</li>)}</ul></details>
      <button type="button" onClick={onCancel} className={`${secondary} mt-6 w-full`}>Cancel search</button>
    </section>
  </main>;
}

function ResultScreen({ result, error, canChangeModel, onEdit, onNew, onSelect, onRefresh, onChangeModel, onAddPrice }: { result: CheckDealResult; error: string | null; canChangeModel: boolean; onEdit: () => void; onNew: () => void; onSelect: (query: string) => void; onRefresh: () => void; onChangeModel: () => void; onAddPrice: () => void }) {
  const choosing = result.comparison?.status === 'needs_selection';
  const [chartsOpen, setChartsOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  return <main className="mx-auto w-full max-w-4xl min-w-0 space-y-5 px-3 pb-12 pt-5 sm:px-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">{choosing ? 'Product found' : 'Your price comparison'}</p>
        <h1 id="deal-page-title" tabIndex={-1} className="mt-2 break-words text-xl font-semibold leading-snug text-white outline-none sm:text-2xl">{result.comparison?.selectedVariant ?? result.product.title}</h1>
        {result.product.claimedPrice && <p className="mt-2 text-sm text-zinc-300">Your offer: <strong className="text-white">{fmt(result.product.claimedPrice)}</strong>{result.product.claimedOriginalPrice ? <span className="ml-3 text-xs text-zinc-400">Original shown: {fmt(result.product.claimedOriginalPrice)}</span> : null}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={onEdit} className={secondary}>Edit search</button>{!choosing && canChangeModel && <button type="button" onClick={onChangeModel} className={secondary}>Change model</button>}</div>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-black/80 p-4 text-sm text-red-200">{error} Your previous results are still available below.</p>}
    {!choosing && <VerdictHeader result={result} onAddPrice={onAddPrice} />}
    <RetailerComparison result={result} onSelect={onSelect} />
    {!choosing && <>
      {result.sellers.length < 2 && <div className="deal-surface p-5"><p className="text-sm leading-relaxed text-zinc-300">{result.sellers.length ? 'We found one matching price. Add the exact model or a product link to find more comparable listings.' : 'Try adding the exact model, size and storage, or paste a full product-page link.'}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={onEdit} className={primary}>Refine my search</button><button type="button" onClick={onRefresh} className={secondary}>Try again</button></div></div>}
      {result.sellers.length >= 2 && <details className="deal-surface p-5" onToggle={(event) => setCalculatorOpen(event.currentTarget.open)}><summary className="cursor-pointer text-sm font-medium text-white">Calculate the total with delivery or a coupon</summary>{calculatorOpen && <div className="mt-4"><PriceScenario result={result} /></div>}</details>}
      {result.sellers.length >= 2 && <details className="deal-surface p-5" onToggle={(event) => setChartsOpen(event.currentTarget.open)}><summary className="cursor-pointer text-sm font-medium text-white">Explore the price charts</summary>{chartsOpen && <Suspense fallback={<p role="status" className="mt-4 text-sm text-zinc-400">Loading charts…</p>}><BrutalistBentoCharts sellers={result.sellers} claimedPrice={result.product.claimedPrice} claimedOriginalPrice={result.product.claimedOriginalPrice} medianPrice={result.medianPrice} verdict={result.verdict} confidence={result.confidence} realDiscountPercent={result.realDiscountPercent} mode={result.mode} /></Suspense>}</details>}
      {!!result.historicalSignals.length && <details className="deal-surface p-5 text-sm text-zinc-300"><summary className="cursor-pointer font-medium text-white">Dated price mentions</summary><p className="mt-3 text-xs text-zinc-400">These are individual mentions, not a complete price history.</p><ul className="mt-3 space-y-2">{result.historicalSignals.map((signal) => <li key={`${signal.url}-${signal.date}`}><a href={signal.url} target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:underline">{fmt(signal.mentionedPrice)} · {signal.date} · {signal.source} ↗</a></li>)}</ul></details>}
    </>}
    <SearchDetails result={result} />
    <div className="flex flex-col items-center gap-4 border-t border-white/10 pt-5 sm:flex-row sm:justify-between">
      <button type="button" onClick={onRefresh} className={secondary}>↻ Refresh prices</button>
      <ReportActions result={result} />
    </div>
    <button id="verdict-check-another" type="button" onClick={onNew} className="mx-auto block py-3 text-sm text-zinc-300 hover:text-white">Search another product →</button>
  </main>;
}

export default function AppFlow() {
  const [step, setStep] = useState<Step>('input');
  const [progress, setProgress] = useState<Partial<Record<ProgressStep, ProgressEvent>>>({});
  const [identified, setIdentified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ input: '' });
  const [result, setResult] = useState<CheckDealResult | null>(null);
  const [modelChoices, setModelChoices] = useState<CheckDealResult | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const returnStepRef = useRef<Step>('input');
  useEffect(() => () => controllerRef.current?.abort(), []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('deal-page-title')?.focus({ preventScroll: true });
  }, [step, result?.id]);

  const runCheck = useCallback(async (input: string, claimedPrice?: number, claimedOriginalPrice?: number, forceRefresh = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    returnStepRef.current = step;
    setStep('loading'); setProgress({}); setIdentified(false); setError(null);
    setDraft({ input, claimedPrice, claimedOriginalPrice });
    try {
      const resolved = await resolveProduct(input, controller.signal);
      if (controller.signal.aborted) return;
      setIdentified(true);
      const data = await checkDealStream({ productQuery: resolved.productQuery, claimedPrice, claimedOriginalPrice, mode: 'live', forceRefresh }, (event) => {
        if (!controller.signal.aborted) setProgress((current) => ({ ...current, [event.step]: event }));
      }, controller.signal);
      if (controller.signal.aborted) return;
      if (data.comparison?.status === 'needs_selection') setModelChoices(data);
      else if (step === 'input') setModelChoices(null);
      setResult(data); setStep('result');
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Could not complete the search. Please try again.');
      setStep(step === 'result' && result ? 'result' : 'input');
    } finally { if (controllerRef.current === controller) controllerRef.current = null; }
  }, [step, result]);

  const reset = () => {
    controllerRef.current?.abort(); setStep('input'); setResult(null); setModelChoices(null); setProgress({}); setError(null); setDraft({ input: '' });
  };
  const edit = (intent?: Intent) => {
    if (result) setDraft({ input: result.product.title, claimedPrice: result.product.claimedPrice ?? undefined, claimedOriginalPrice: result.product.claimedOriginalPrice ?? undefined, intent });
    setError(null); setStep('input');
  };
  const choosing = result?.comparison?.status === 'needs_selection';
  return <div className="relative min-h-screen min-h-[100dvh] overflow-x-clip bg-[#09090b] text-white">
    <Suspense fallback={null}>{step === 'result' ? <EmeraldHorizonBg /> : <NebulaBackground />}</Suspense>
    <div className="relative z-10">
      <header className="border-b border-white/10 bg-[#09090b]/90 px-3 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link to="/" className="text-base font-semibold">Price<span className="text-amber-400">Honest</span></Link>
          {step === 'result' ? <button id="check-another-btn" type="button" onClick={reset} className="min-h-10 px-3 text-sm text-zinc-300 hover:text-white">New search</button> : <Link to="/" className="min-h-10 py-2 text-sm text-zinc-300 hover:text-white">← Home</Link>}
        </div>
      </header>
      <FlowSteps current={step === 'input' ? 0 : step === 'loading' || choosing ? 1 : 2} />
      {step === 'input' && <InputScreen key={`${draft.input}-${draft.intent ?? ''}`} draft={draft} error={error} onSubmit={runCheck} onBack={result ? () => { setStep('result'); setError(null); } : undefined} />}
      {step === 'loading' && <LoadingScreen query={draft.input} progress={progress} identified={identified} onCancel={() => { controllerRef.current?.abort(); setStep(returnStepRef.current === 'result' && result ? 'result' : 'input'); setProgress({}); setError(null); }} />}
      {step === 'result' && result && <ResultScreen key={result.id} result={result} error={error} canChangeModel={!!modelChoices && !choosing} onEdit={() => edit()} onAddPrice={() => edit('check')} onNew={reset} onSelect={(query) => runCheck(query, result.product.claimedPrice ?? undefined, result.product.claimedOriginalPrice ?? undefined)} onRefresh={() => runCheck(result.product.title, result.product.claimedPrice ?? undefined, result.product.claimedOriginalPrice ?? undefined, true)} onChangeModel={() => { if (modelChoices) setResult({ ...modelChoices, product: { ...modelChoices.product, claimedPrice: result.product.claimedPrice, claimedOriginalPrice: result.product.claimedOriginalPrice } }); }} />}
    </div>
  </div>;
}
