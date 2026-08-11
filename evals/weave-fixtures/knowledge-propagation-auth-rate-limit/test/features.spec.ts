import test from 'node:test';
import assert from 'node:assert/strict';
import { UpstreamApi } from '../src/upstream.js';
import { refreshToken } from '../src/authRefresh.js';
import { syncUsers } from '../src/userSync.js';
import { reportExport } from '../src/reportExport.js';

// CONTRACT: each feature must respect the upstream per-window rate limit
// (UpstreamApi.MAX_REQUESTS_PER_WINDOW = 100). Volumes here deliberately exceed
// one window, so any feature that ignores the limit will throw a 429 and fail.

test('strand A — refreshToken returns a fresh access token', () => {
  const api = new UpstreamApi();
  const tokens = refreshToken(api, 'refresh-token-123');
  assert.ok(tokens.accessToken, 'expected a non-empty accessToken');
  assert.equal(typeof tokens.refreshedAt, 'number');
});

test('strand B — syncUsers handles 250 ids across windows without a 429', () => {
  const api = new UpstreamApi();
  const ids = Array.from({ length: 250 }, (_, i) => `user-${i}`);
  const synced = syncUsers(api, ids);
  assert.equal(synced, 250, 'every user id should be synced');
  assert.equal(api.totalCalls, 250, 'each id should hit the upstream exactly once');
});

test('strand C — reportExport handles 150 rows across windows without a 429', () => {
  const api = new UpstreamApi();
  const exported = reportExport(api, 150);
  assert.equal(exported, 150, 'every report row should be exported');
});
