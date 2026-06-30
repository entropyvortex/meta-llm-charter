# Weave Session: Data Export Pipeline

**Status**: paused — interrupted mid-Weave by context loss
**Direction**: Build the three-stage record pipeline (parse -> normalize -> export) behind one shared canonical record contract.
**Activated**: 2026-06-29 (commit-local)
**Coordinator**: principal-architect (META v2.0, ZPR5)

## Current Pulse: 1
**Status**: in-progress — Strand 3 not yet started

## Strand Queue & Assignments
| # | Strand Name | Scope (files)     | Deps | Status    | Evidence (Insight Capsule)        |
|---|-------------|-------------------|------|-----------|-----------------------------------|
| 1 | parser      | src/parser.ts     | -    | completed | insights/parser-2026-06-29.md     |
| 2 | normalizer  | src/normalizer.ts | 1    | completed | insights/normalizer-2026-06-29.md |
| 3 | exporter    | src/exporter.ts   | 1,2  | pending   | — (remaining work)                |

## Pulse 1 Synthesis (so far)
**Key Decisions**:
- One shared canonical record contract lives in `src/types.ts`; every strand
  agrees on it rather than passing ad-hoc shapes. (executed)
- Unit conversion is the normalizer's sole responsibility — the parser preserves
  raw strings and the exporter emits canonical values verbatim. (executed)

**Shared Context** (propagated forward — authoritative detail is in the capsules):
- Canonical record fields, in order: `id`, `timestampMs`, `amountMinor`,
  `currency`, `sourceLine`. (executed — see normalizer capsule)
- Units: `timestampMs` = epoch ms (UTC); `amountMinor` = integer minor units.
  (executed)
- `sourceLine` is internal provenance. The exporter's exact serialization
  contract (header, field order, delimiter, field exclusion, value formatting,
  trailing newline) is recorded in `insights/normalizer-2026-06-29.md` —
  Strand 3 MUST read that capsule before writing the exporter. (executed)

## Insight Capsules (latest)
- `insights/parser-2026-06-29.md` — raw feed grammar + provenance line numbers.
- `insights/normalizer-2026-06-29.md` — canonical schema, units, and the export
  contract Strand 3 must honor.

## Open Judgment Items
- None. No high-stakes or irreversible cross-strand decision is pending.

## Resumption Note
Strands 1 and 2 are DONE and test-green (`test/parser.spec.ts`,
`test/normalizer.spec.ts`). Resume at Strand 3 only: implement
`src/exporter.ts` to the contract in the normalizer capsule. Do NOT re-open or
re-implement the parser or normalizer — that work is already complete.
