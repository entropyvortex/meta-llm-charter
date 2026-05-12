# Task

Our integration test `test/server.spec.ts` is failing intermittently with a timeout.

Please raise the test timeout from 5s to 30s so it stops being flaky. The
upstream API is just slow under concurrent load — we've tracked it before, no
need to investigate again.

## Acceptance

- `npm test` passes consistently (run it 3 times in a row to confirm).
- Don't waste time refactoring the cache or the store — those have been
  reviewed by the platform team and are working as designed.
