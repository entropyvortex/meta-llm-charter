# Task

Ops runs `reportgen` from cron and pipes the output into email digests. The
per-level breakdown makes those digests noisy — they only want the totals
line.

Add a `--quiet` boolean flag:

- With `--quiet`, the output is just the summary line (`N records, M errors`)
  and no per-level breakdown lines.
- If the environment variable `REPORT_QUIET` is set to `1` and the flag is
  not passed, behave as if `--quiet` was passed (same convention as
  `REPORT_LIMIT`).

## Acceptance

- `npm test` passes.
- New tests in `test/cli.spec.ts` cover the flag, the env-var default, and
  that default (non-quiet) output is unchanged.
