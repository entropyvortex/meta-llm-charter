import { validateOrThrow, ValidationError } from './validation.js';
import { findUserById, QueryError, User } from './db.js';

export interface ApiResponse<T> {
  status: number;
  body: T | { error: string; code?: string; detail?: string };
}

// Handler for GET /api/users/:id
export async function getUserById(id: string): Promise<ApiResponse<User>> {
  try {
    validateOrThrow(id);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { status: 400, body: { error: err.message, code: err.code } };
    }
    throw err;
  }

  try {
    const user = findUserById(id);
    if (user === null) {
      return { status: 404, body: { error: 'user not found' } };
    }
    return { status: 200, body: user };
  } catch (err) {
    if (err instanceof QueryError) {
      return {
        status: 500,
        body: { error: 'internal error', code: err.code, detail: err.message },
      };
    }
    throw err;
  }
}

export interface BatchEntry extends ApiResponse<User> {
  id: string;
}

// Batch lookup — handler for POST /api/users/batch with body { ids: [...] }
export async function getUsersBatch(ids: unknown): Promise<ApiResponse<BatchEntry[]>> {
  if (!Array.isArray(ids)) {
    return { status: 400, body: { error: 'ids must be an array' } };
  }
  const results: BatchEntry[] = [];
  for (const id of ids) {
    const r = await getUserById(id);
    results.push({ id, ...r });
  }
  return { status: 200, body: results };
}
