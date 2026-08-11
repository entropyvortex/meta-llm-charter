/**
 * Shared pipeline types — the canonical record contract every strand agrees on.
 *
 * Shared infrastructure for the data-export Weave. Strand 1 (parser) produces
 * RawRecord; Strand 2 (normalizer) produces CanonicalRecord; Strand 3
 * (exporter) serializes CanonicalRecord[]. The field DECLARATION ORDER below is
 * the canonical order; the exact export serialization the exporter must honor is
 * recorded in the seeded Insight Capsules under `.planning/weave/insights/`.
 *
 * Do not modify this file.
 */

/** Output of Strand 1 (parser): one raw input line, values left untouched. */
export interface RawRecord {
  /** `key=value` pairs; keys lowercased and values trimmed, units NOT converted. */
  fields: Record<string, string>;
  /** 1-based PHYSICAL line number in the source (skipped lines still count). */
  lineNo: number;
}

/**
 * Output of Strand 2 (normalizer): the canonical record. The field declaration
 * order IS the canonical order. `sourceLine` is internal provenance.
 */
export interface CanonicalRecord {
  id: string;
  /** Epoch MILLISECONDS, UTC. */
  timestampMs: number;
  /** INTEGER minor units (e.g. cents): round(major * 100). */
  amountMinor: number;
  /** ISO-4217 code, uppercase; '' when unknown. */
  currency: string;
  /** 1-based source line — provenance only. */
  sourceLine: number;
}
