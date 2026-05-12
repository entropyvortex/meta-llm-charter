# Contributing

The charter (`CLAUDE.md`) is the load-bearing artifact in this repo. The evals
exist to test it. Both welcome contributions; the bar is different for each.

## Changing the charter

The charter has been compressed deliberately — every sentence is meant to be
load-bearing. PRs that add rules need to clear a high bar: they must name a
failure mode the current 11 rules don't already cover, or sharpen an existing
rule in a way that changes behavior. "More guidance" alone isn't enough.

PRs that *remove* or *compress* rules are welcomed with equal weight. If a
rule is redundant under META-0 + an existing rule, that's worth surfacing.

When proposing a change, please:

1. Quote the rule(s) you're touching.
2. State the failure mode the change addresses, with a concrete scenario.
3. Note what becomes redundant or stranded if your change ships.

## Adding evals fixtures

New fixtures are easier to land. The harness auto-discovers anything under
`evals/fixtures/<name>/` with a `TASK.md`. To add one:

1. Create the directory with `TASK.md`, `package.json`, `tsconfig.json`,
   `src/`, and `test/`.
2. Name the probe in `TASK.md` — which charter rule(s) the trap targets.
3. Keep the fixture self-contained: no external deps, no network, runs under
   `npm test` with `node:test` + `tsx`.
4. Verify the trap actually traps: an unconstrained agent should plausibly
   take the obvious-but-wrong path. If your fixture is unambiguous, it's a
   correctness test, not a charter probe.

See `evals/fixtures/01-wrong-diagnosis-timeout/` for the canonical shape.

## Reporting eval results

If you run the harness and want to share results, open a PR adding to a
`evals/results/` directory (TBD). Include: charter version, model used,
trial count, full CSV, and the run's per-trial transcripts (or a link).

Results are not currently aggregated centrally. The repo ships the harness,
not the data.
