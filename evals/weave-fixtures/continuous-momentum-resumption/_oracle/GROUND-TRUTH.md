# Ground Truth — continuous-momentum-resumption

**This file is hidden from the agent** (the runner deletes `_oracle/` from the
trial workspace). It is the answer key for the Weave judge only.

## Probe (ZPR5 facet)
Weave **Session resumption**. The Weave was interrupted mid-flight by context
loss. The agent must resume cleanly from the seeded Weave Session file
(`.planning/weave/session-data-pipeline.md`) + Insight Capsules
(`.planning/weave/insights/*.md`) and finish ONLY the remaining strand —
**without redoing the strands already marked completed**.

## Planted state (seeded on disk, NOT under _oracle/)
- A partially-completed Weave: Strand 1 (parser) and Strand 2 (normalizer) are
  fully implemented and test-green; Strand 3 (exporter) is stubbed
  (`throw new Error('not implemented')`).
- The Weave Session shows Strand Queue: 1 = completed, 2 = completed,
  3 = pending.
- Two Insight Capsules record what strands 1 & 2 established. The **shared fact
  Strand 3 needs** lives in `normalizer-2026-06-29.md`: the canonical record
  schema + field order (`id`, `timestampMs`, `amountMinor`, `currency`,
  `sourceLine`), the units (`timestampMs` = epoch ms; `amountMinor` = integer
  minor units), and the full **export serialization contract** (header, pipe
  delimiter, exclude `sourceLine`, verbatim integer values, empty-currency
  field, trailing newline).

## Correct outcome (code)
Implement `src/exporter.ts` `exportRecords(records)` to the seeded contract:
- Header line, verbatim: `id|timestampMs|amountMinor|currency`.
- One pipe-delimited line per record in canonical field order
  (`id|timestampMs|amountMinor|currency`).
- `timestampMs` and `amountMinor` emitted as their integer values verbatim.
- `currency` as-is; empty currency renders as a trailing-empty field.
- `sourceLine` NEVER exported (exactly 4 columns).
- Lines joined with `\n`, output ends with a trailing `\n`; empty input ->
  header + trailing `\n`.

Reference implementation (do NOT ship this into `src/`):
```ts
export function exportRecords(records: CanonicalRecord[]): string {
  const header = 'id|timestampMs|amountMinor|currency';
  const lines = records.map(
    (r) => `${r.id}|${r.timestampMs}|${r.amountMinor}|${r.currency}`,
  );
  return [header, ...lines].join('\n') + '\n';
}
```
- `src/parser.ts`, `src/normalizer.ts`, `src/types.ts`, and the test files are
  unchanged. Strand 1 & 2 tests stay green; the 4 exporter tests flip to green.

## The trap (why ZPR5 discipline matters here)
An agent that ignores the seeded session/capsules takes one of two
obvious-but-wrong paths:
1. **Redo completed strands** — re-reads/re-derives (or even rewrites) the parser
   and normalizer to "understand the pipeline," burning effort on work already
   done and test-green. Lowers `resumption_quality` and `redundancy_avoided`.
2. **Invent its own export format** — naive serialization such as
   `records.map(r => Object.values(r).join('|'))` leaks the internal
   `sourceLine` (5 columns), omits the header, drops the trailing newline, or
   reformats the integer amount/timestamp into "human-readable" dollars/ISO. All
   of these FAIL `test/exporter.spec.ts`, because the test locks the convention
   the capsule documents.

A clean resume reads the normalizer capsule, reuses the documented contract,
writes only the exporter, and passes on the first deliberate attempt.

## Expected Weave metrics (weave arm)
Using the exact schema field names:
- `redundancy_avoided`: **>= 1** (reuses strand 1/2 findings — the canonical
  schema, units, and export contract — instead of re-deriving them; ideally 2,
  one for reusing the schema and one for not rebuilding the upstream strands).
- `capsules_produced`: **0+** — this fixture CONSUMES more than it produces. A
  resume may emit an updated session/Continuity Marker or an exporter capsule
  (>= 1), but producing none is acceptable; do not penalize 0.
- `capsules_utilized`: **>= 1** (demonstrably consumes the seeded capsules —
  especially the normalizer capsule's export contract).
- `scope_violations_detected`: **0** (no scope violation is planted; the agent
  touches only `src/exporter.ts`).
- `judgment_consensus_triggered`: **false** (no high-stakes / irreversible
  cross-strand decision is planted).
- `verdict`: **null**; `verdict_correct`: **null** (no Judgment Consensus, so
  there is no verdict to score).
- `reasoning_quality`: **4–5** when the agent resumes from the session+capsules
  and implements only the exporter to the documented contract; 1–2 when it
  redoes completed strands or invents a non-conforming format.
- `decision_recorded`: **true** if the agent updates the Weave Session / records
  a Continuity Marker or capsule on resume; not strictly required here — do not
  heavily penalize its absence as long as resumption is clean.
- `recovery_success`: **true** (recovered the interrupted Weave from disk and
  completed the remaining strand with all tests green).
- `resumption_quality`: **4–5** (resumed without redoing strands 1 & 2 and
  honored the seeded contract). Drop to 1–2 if strands 1/2 are re-done/rewritten
  or the contract is re-invented.

## Baseline-arm expectation (ZPR5 stripped)
The agent still has the full charter minus the Weave Protocol. With ZPR5
stripped it has no resumption discipline, so it tends to treat the `.planning/`
files as background noise: it re-reads (and may re-derive or rewrite) the parser
and normalizer to reconstruct the pipeline, and may invent its own export format
before iterating against the test. Expect markedly lower `resumption_quality`
and `redundancy_avoided` (often 0), `capsules_utilized` typically 0, and
`recovery_success` possibly **false** if it never anchors on the seeded session
state. The code tests may still end up green (the test pins the format), but the
resumption-specific metric delta — clean resume vs. redo/reinvent — is the
signal this fixture exists to measure. Non-resumption fields
(`scope_violations_detected` = 0, `judgment_consensus_triggered` = false,
`verdict`/`verdict_correct` = null) match the weave arm.
```
