# Insight Capsule — Strand: normalizer — Pulse 1 (2026-06-29)

**Scope**: `src/normalizer.ts` (read-only on `src/types.ts` + parser capsule)
**Status**: completed, test-green (`test/normalizer.spec.ts`)

## What was built
- `normalize(raw: RawRecord): CanonicalRecord` — converts one raw record into
  the canonical contract. (executed)

## Canonical record schema (THE shared contract — field order is significant)
1. `id` — string, required (`normalize` throws when absent). (executed)
2. `timestampMs` — epoch MILLISECONDS, UTC. Converted from the raw ISO-8601 `ts`
   via `Date.parse`. (executed)
3. `amountMinor` — INTEGER minor units: `round(major * 100)` (2-decimal /
   centesimal assumption). e.g. `42.00 -> 4200`, `19.99 -> 1999`. (executed)
4. `currency` — ISO-4217, UPPERCASED; `''` when the raw `cur` field is absent.
   (executed)
5. `sourceLine` — provenance line number carried from the parser. INTERNAL.
   (executed)

## Export contract for Strand 3 (the exporter MUST honor this — do not reinvent)
- Output is pipe-delimited (`|`) UTF-8 text. (inspected)
- The first line is the header, verbatim: `id|timestampMs|amountMinor|currency`.
  (inspected)
- Then one line per record, fields in the canonical order above:
  `id|timestampMs|amountMinor|currency`. (inspected)
- Emit `timestampMs` and `amountMinor` as their INTEGER values verbatim — no
  decimal points, thousands separators, or ISO reformatting. (inspected)
- `currency` is emitted as-is; an empty currency renders as an empty field, so
  the line ends with a trailing `|`. (inspected)
- `sourceLine` is INTERNAL provenance and is NEVER exported — every line has
  exactly 4 columns, not 5. (inspected)
- Lines are joined with `\n` and the whole output ends with a trailing `\n`.
  Empty input yields the header line plus the trailing `\n`. (inspected)

## Forward implications
- Strand 3 needs ONLY `src/exporter.ts`. The parser and normalizer are done and
  test-green; reuse this contract instead of re-deriving the schema or rebuilding
  the upstream strands. (assumed)
