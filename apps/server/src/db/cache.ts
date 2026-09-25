import { SourceEvidence } from "../types";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  touchedAt: number;
}

const MAX_ENTRIES = 100;
const DEFAULT_TTL = 10 * 60 * 1000;
const store = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<SourceEvidence>>();

export function normalizeKey(key: string): string {
  return key.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
}

function evictIfNeeded(): void {
  while (store.size >= MAX_ENTRIES) {
    const oldest = Array.from(store.entries()).sort(
      (a, b) => a[1].touchedAt - b[1].touchedAt,
    )[0];
    if (!oldest) return;
    store.delete(oldest[0]);
  }
}

export function get<T = unknown>(key: string): T | null {
  const normalized = normalizeKey(key);
  const entry = store.get(normalized) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(normalized);
    return null;
  }
  entry.touchedAt = Date.now();
  return entry.data;
}

export function set<T = unknown>(
  key: string,
  data: T,
  ttl = DEFAULT_TTL,
): void {
  const normalized = normalizeKey(key);
  if (!store.has(normalized)) evictIfNeeded();
  store.set(normalized, {
    data,
    expiresAt: Date.now() + Math.max(1, ttl),
    touchedAt: Date.now(),
  });
}

export function getEvidence(key: string): SourceEvidence | null {
  return get<SourceEvidence>(`evidence:${key}`);
}

export function setEvidence(
  key: string,
  evidence: SourceEvidence,
  ttl = DEFAULT_TTL,
): void {
  set(`evidence:${key}`, evidence, ttl);
}

export function getInFlight(key: string): Promise<SourceEvidence> | undefined {
  return inFlight.get(normalizeKey(`evidence:${key}`));
}

export function setInFlight(
  key: string,
  promise: Promise<SourceEvidence>,
): void {
  const normalized = normalizeKey(`evidence:${key}`);
  inFlight.set(normalized, promise);
  void promise
    .finally(() => {
      if (inFlight.get(normalized) === promise) inFlight.delete(normalized);
    })
    .catch(() => undefined);
}

export function size(): number {
  return store.size;
}

export function clear(): void {
  store.clear();
  inFlight.clear();
}
