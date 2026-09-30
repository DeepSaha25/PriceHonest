import type { ResolveProductResult, CheckDealResult, CheckRequest, ProgressEvent } from './types';

const BASE = '/api';

async function post<T>(path: string, body: object, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function resolveProduct(input: string, signal?: AbortSignal): Promise<ResolveProductResult> {
  return post<ResolveProductResult>('/resolve-product', { input }, signal);
}

export async function checkDealStream(request: CheckRequest, onProgress: (event: ProgressEvent) => void, signal?: AbortSignal): Promise<CheckDealResult> {
  const response = await fetch(`${BASE}/check-deal/stream`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal,
  });
  if (!response.ok || !response.body) throw new Error('The search service could not be reached. Please try again.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: CheckDealResult | undefined;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as ProgressEvent | { type: 'result'; data: CheckDealResult } | { type: 'error'; error: string };
    if (event.type === 'progress') onProgress(event);
    else if (event.type === 'result') result = event.data;
    else if (event.type === 'error') throw new Error(event.error);
  };
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(consume);
      if (chunk.done) break;
    }
    consume(buffer);
  } finally { reader.releaseLock(); }
  if (!result) throw new Error('The search ended before a report was returned. Please try again.');
  return result;
}

export async function checkDeal(
  productQuery: string,
  claimedPrice?: number,
  claimedOriginalPrice?: number
): Promise<CheckDealResult> {
  return post<CheckDealResult>('/check-deal', {
    productQuery,
    claimedPrice,
    claimedOriginalPrice,
  });
}
