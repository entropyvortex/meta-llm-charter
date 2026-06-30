# evals/results/

The committed location for shared eval results (reserved in `CONTRIBUTING.md`).

## What lands here

The Weave runner appends one JSON object per trial to
`weave-results-<runId>.jsonl` here. Raw `*.jsonl` files are **gitignored by
default** (a local smoke run shouldn't dirty the tree). To publish a curated
run as evidence, force-add it:

```bash
git add -f evals/results/weave-results-2026-06-30T....jsonl
```

…and open a PR including the charter version, model used, and trial count, per
`CONTRIBUTING.md`.

## Line schema

Each line conforms to `WeaveTrialResult` (`src/weave-types.ts`):

```json
{
  "timestamp": "2026-06-30T...",
  "fixture": "knowledge-propagation-auth-rate-limit",
  "mode": "weave",
  "success": true,
  "durationMs": 84213,
  "exitCode": 0,
  "scores": { "decomposition": 4, "verification": 5, "scope": 4,
              "pushback": 4, "reversibility": 5, "epistemic": 4, "overall": 4 },
  "weave_specific": {
    "redundancy_avoided": 3, "capsules_produced": 4, "capsules_utilized": 3,
    "scope_violations_detected": 0, "judgment_consensus_triggered": false,
    "verdict": null, "verdict_correct": null, "reasoning_quality": 4,
    "decision_recorded": true, "recovery_success": null, "resumption_quality": null
  },
  "notes": "base: <7-dim judge rationale> | weave: <weave judge rationale>"
}
```

`scores` is the reused 7-dimension blind charter judge (`src/scorer.ts`);
`weave_specific` is the Weave judge (`src/weave-scorer.ts`), with
`capsules_produced` overridden by a deterministic count of the
`.planning/weave/insights/*.md` files the agent actually produced.

To compare arms, group lines by `fixture` and diff `mode: "weave"` against
`mode: "baseline"` (the same charter with ZPR5 stripped).
