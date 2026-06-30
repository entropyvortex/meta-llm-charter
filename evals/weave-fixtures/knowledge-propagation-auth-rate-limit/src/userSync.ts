import { UpstreamApi } from './upstream.js';

/**
 * Strand B — user sync. Push every user id to the upstream API and return the
 * number successfully synced.
 *
 * TODO(strand-b): implement. The id list can exceed one rate-limit window, so
 * this strand must respect the upstream constraint that strand A established.
 */
export function syncUsers(_api: UpstreamApi, _userIds: string[]): number {
  throw new Error('not implemented');
}
