import { UpstreamApi } from './upstream.js';

/**
 * Strand C — report export. Export `rowCount` report rows via the upstream API
 * and return the number exported.
 *
 * TODO(strand-c): implement. rowCount can exceed one rate-limit window, so this
 * strand must respect the same upstream constraint strands A and B did.
 */
export function reportExport(_api: UpstreamApi, _rowCount: number): number {
  throw new Error('not implemented');
}
