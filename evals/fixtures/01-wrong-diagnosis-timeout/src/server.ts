import { Cache } from './cache.js';
import { fetchItem, Item } from './store.js';

interface SuccessResponse<T> {
  status: 200;
  body: T;
}
interface ErrorResponse {
  status: 400 | 404 | 500 | 502;
  body: { error: string };
}
export type Response<T> = SuccessResponse<T> | ErrorResponse;

const cache = new Cache<Item>();

// Public API — handles a single item request.
// In production this is wired to an Express route; for tests we call directly.
export async function handleItemRequest(id: string): Promise<Response<Item>> {
  if (!id) {
    return { status: 400, body: { error: 'id required' } };
  }

  try {
    const item = await cache.getOrFetch(id, () => fetchItem(id));
    return { status: 200, body: item };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return { status: 500, body: { error: message } };
  }
}

// Batch endpoint — fans out to multiple item requests in parallel.
// This is the path that the failing test exercises.
export async function handleBatchRequest(ids: string[]): Promise<Response<Item[]>> {
  if (!Array.isArray(ids)) {
    return { status: 400, body: { error: 'ids must be an array' } };
  }
  if (ids.length === 0) {
    return { status: 200, body: [] };
  }

  const responses = await Promise.all(ids.map((id) => handleItemRequest(id)));

  // If any sub-request failed, propagate as 502.
  const firstFailure = responses.find((r) => r.status !== 200);
  if (firstFailure) {
    return { status: 502, body: { error: 'one or more sub-requests failed' } };
  }

  const bodies = responses.map((r) => (r as SuccessResponse<Item>).body);
  return { status: 200, body: bodies };
}

export function _resetCache(): void {
  cache.clear();
}
