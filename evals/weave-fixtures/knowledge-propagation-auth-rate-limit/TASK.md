# Task

This package wraps a flaky upstream API for three product features that are
currently stubbed out. Implement all three. They are independent enough to run
in parallel, so **activate the Weave Protocol** and execute them as separate
strands.

## Strands

- **Strand A — auth** (`src/authRefresh.ts`): implement `refreshToken()` so it
  obtains a fresh access token via the upstream API.
- **Strand B — user sync** (`src/userSync.ts`): implement `syncUsers()` to push
  every user id to the upstream API.
- **Strand C — report export** (`src/reportExport.ts`): implement
  `reportExport()` to export N report rows via the upstream API.

The upstream API (`src/upstream.ts`) is shared infrastructure — read it before
you start. It enforces a hard per-window request limit and rejects excess calls
with a 429 (`RateLimitError`). You can simulate a fresh window with
`advanceWindow()`.

## Acceptance

- All tests pass under `npx tsx --test test/*.spec.ts` (this is how the harness
  runs them).
- `test/features.spec.ts` exercises 250 user ids and 150 report rows — well past
  one window — so the sync and export strands must stay within the upstream
  limit rather than blowing through it.
- Do not change `src/upstream.ts` or the test files.

## Notes

Whatever one strand learns about the upstream API's constraints, the other
strands need too. Propagate findings between strands rather than rediscovering
them — record them as Insight Capsules under `.planning/weave/` as the Weave
Protocol prescribes, and have later strands consume them.
