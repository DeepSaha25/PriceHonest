export type VerdictType = 'genuine_deal' | 'inflated_discount' | 'not_actually_cheap' | 'market_overview' | 'insufficient_data';
export type Confidence = 'high' | 'medium' | 'low';
export type DataMode = 'live' | 'demo';
export type PriceSource = 'retailer_page' | 'google_shopping' | 'search_index' | 'demo';
export interface ProductVariant { id: string; title: string; query: string; sellerCount: number; lowestPrice: number }
export interface ComparisonInfo { status: 'ready' | 'needs_selection' | 'insufficient'; selectedVariant: string | null; variants: ProductVariant[] }
export interface RetailerCoverage { id: string; name: string; domain: string; status: 'success' | 'empty' | 'error' | 'demo'; count: number; searchUrl: string; message?: string }

export interface SellerPrice {
  name: string;
  title?: string;
  price: number;
  link: string;
  rating?: number;
  thumbnail?: string;
  origin?: 'shopping' | 'retailer';
  match?: 'strong' | 'possible';
  delivery?: string;
  priceSource?: PriceSource;
  checkedAt?: string;
  availability?: 'in_stock' | 'unknown';
}

export interface HistoricalSignal { source: string; mentionedPrice: number; date: string; url: string }
export interface Evidence { title: string; url: string; source: string; snippet: string; date?: string; mentionedPrice?: number }
export interface Product { title: string; image: string | null; claimedPrice: number | null; claimedOriginalPrice: number | null }
export interface Observation { checkedAt: string; lowestPrice: number; medianPrice: number; sellerCount: number }
export interface Source { id: 'shopping' | 'retailers' | 'context'; label: string; status: 'success' | 'empty' | 'error' | 'demo'; count: number }

export interface CheckDealResult {
  id: string;
  product: Product;
  verdict: VerdictType;
  confidence: Confidence;
  realDiscountPercent: number | null;
  advertisedDiscountPercent: number | null;
  marketDiscountPercent: number | null;
  savingsVsCheapest: number | null;
  sellers: SellerPrice[];
  cheapestSeller: SellerPrice | null;
  medianPrice: number | null;
  historicalSignals: HistoricalSignal[];
  evidence: Evidence[];
  rationale: string;
  reasons: string[];
  warnings: string[];
  excludedCount: number;
  sources: Source[];
  observations: Observation[];
  fromCache: boolean;
  checkedAt: string;
  mode: DataMode;
  analysisVersion: string;
  comparison?: ComparisonInfo;
  retailers?: RetailerCoverage[];
  evidenceObservedAt?: string | null;
}

export interface ResolveProductResult { productQuery: string; sourceUrl?: string; platform?: string; warning?: string }
export interface CheckRequest { productQuery: string; claimedPrice?: number; claimedOriginalPrice?: number; mode?: DataMode; forceRefresh?: boolean }
export type ProgressStep = 'shopping' | 'retailers' | 'context' | 'analysis';
export interface ProgressEvent { type: 'progress'; step: ProgressStep; status: 'running' | 'done' | 'error'; message: string }
export interface Health { status: string; serpapi: string; llm?: string; version?: string }
export interface SavedTarget { id: string; query: string; target: number; mode: DataMode; result: CheckDealResult; createdAt: string }
