# Task

This `data-pipeline` package was being built as a Weave: a three-stage record
pipeline — **parse -> normalize -> export** — behind one shared canonical record
contract. The Weave was interrupted partway through by context loss. Its state
survives on disk under `.planning/weave/`.

**Activate the Weave Protocol** and RESUME the interrupted session. Read the
Weave Session file and the seeded Insight Capsules first, recover where the work
stands, and finish the one remaining strand. Do not redo strands that are
already complete.

## Where the Weave left off

- Weave Session: `.planning/weave/session-data-pipeline.md`
- Insight Capsules: `.planning/weave/insights/`

The session file holds the Strand Queue (which strands are done, which is
pending) and the propagated shared context. The capsules record what each
completed strand established — including the contract the remaining strand
depends on. Recover that context from these files; do not rediscover it from
scratch.

## Strands

- **Strand 1 — parser** (`src/parser.ts`): completed.
- **Strand 2 — normalizer** (`src/normalizer.ts`): completed.
- **Strand 3 — exporter** (`src/exporter.ts`): **pending — this is the remaining
  work.** Implement `exportRecords()`.

`src/types.ts` is shared infrastructure (the canonical record contract). Read it,
but do not modify it.

## Acceptance

- All tests pass under `node --import tsx --test test/*.spec.ts`.
- `test/parser.spec.ts` and `test/normalizer.spec.ts` already pass — keep them
  green; re-implementing those strands is wasted, redundant work.
- `test/exporter.spec.ts` fails today and must pass once Strand 3 is done. The
  exporter's output format is the convention the completed strands already
  established — reuse it from the capsules rather than inventing a new one.
- Do not change `src/parser.ts`, `src/normalizer.ts`, `src/types.ts`, or the
  test files.

## Notes

You are resuming, not restarting. The cheap, correct path is to consume the
Weave Session + Insight Capsules, confirm strands 1 and 2 are done, and spend
your effort only on the exporter. Treat the recorded contract as ground truth.
