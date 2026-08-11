import { UpstreamApi } from './upstream.js';

export interface Tokens {
  accessToken: string;
  refreshedAt: number;
}

/**
 * Strand A — auth. Obtain a fresh access token via the upstream API.
 *
 * TODO(strand-a): implement. This is the strand that first touches the upstream
 * API and surfaces its rate-limit behavior; what you learn here, strands B and
 * C need too.
 */
export function refreshToken(_api: UpstreamApi, _refreshToken: string): Tokens {
  throw new Error('not implemented');
}
