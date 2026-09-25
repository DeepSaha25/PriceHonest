export type DealMode = "live" | "demo";
export type VerdictType =
  | "genuine_deal"
  | "inflated_discount"
  | "not_actually_cheap"
  | "market_overview"
  | "insufficient_data";
export type Confidence = "high" | "medium" | "low";
export type MatchStatus = "strong" | "possible";
export type SourceId = "shopping" | "retailers" | "context";
export type SourceStatus = "success" | "empty" | "error" | "demo";
export type PriceSource = "retailer_page" | "google_shopping" | "search_index" | "demo";

export interface RetailerCoverage {
  id: string;
  name: string;
  domain: string;
  status: SourceStatus;
  count: number;
  searchUrl: string;
  message?: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  query: string;
  sellerCount: number;
  lowestPrice: number;
}

export interface ComparisonInfo {
  status: "ready" | "needs_selection" | "insufficient";
  selectedVariant: string | null;
  variants: ProductVariant[];
}

export interface SellerPrice {
  name: string;
  title: string;
  price: number;
  link: string;
  rating?: number;
  thumbnail?: string;
  origin: "shopping" | "retailer";
  match: MatchStatus;
  delivery?: string;
  priceSource?: PriceSource;
  checkedAt?: string;
  availability?: "in_stock" | "unknown";
}

export interface HistoricalSignal {
  source: string;
  mentionedPrice: number;
  date: string;
  url: string;
}

export interface EvidenceItem {
  title: string;
  url: string;
  source: string;
  snippet: string;
  date?: string;
  mentionedPrice?: number;
}

export interface SourceStatusInfo {
  id: SourceId;
  label: string;
  status: SourceStatus;
  count: number;
}

export interface Observation {
  checkedAt: string;
  lowestPrice: number;
  medianPrice: number;
  sellerCount: number;
}

export interface CheckDealResult {
  id: string;
  product: {
    title: string;
    image: string | null;
    claimedPrice: number | null;
    claimedOriginalPrice: number | null;
  };
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
  evidence: EvidenceItem[];
  rationale: string;
  reasons: string[];
  warnings: string[];
  excludedCount: number;
  sources: SourceStatusInfo[];
  observations: Observation[];
  fromCache: boolean;
  checkedAt: string;
  mode: DealMode;
  analysisVersion: string;
  comparison: ComparisonInfo;
  retailers: RetailerCoverage[];
  evidenceObservedAt: string | null;
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
}

export interface ShoppingResult {
  title: string;
  price: number;
  source: string;
  link: string;
  rating?: number;
  thumbnail?: string;
  delivery?: string;
  snippet?: string;
  priceSource?: PriceSource;
  checkedAt?: string;
  availability?: "in_stock" | "out_of_stock" | "unknown";
}

export interface ProviderBatch<T> {
  items: T[];
  status: SourceStatus;
  warning?: string;
  excludedCount?: number;
  warnings?: string[];
  coverage?: RetailerCoverage[];
}

export interface SourceEvidence {
  query: string;
  mode: DealMode;
  shopping: ProviderBatch<ShoppingResult>;
  retailers: ProviderBatch<ShoppingResult>;
  context: ProviderBatch<SearchResult>;
  observedAt?: string;
}

export interface DealRequest {
  productQuery: string;
  claimedPrice?: number;
  claimedOriginalPrice?: number;
  mode: DealMode;
  forceRefresh: boolean;
}

export interface ProgressEvent {
  type: "progress";
  step: "shopping" | "retailers" | "context" | "analysis";
  status: "running" | "done" | "error";
  message: string;
}
