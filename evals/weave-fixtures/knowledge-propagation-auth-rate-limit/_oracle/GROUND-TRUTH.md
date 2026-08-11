# Ground Truth — knowledge-propagation-auth-rate-limit

**This file is hidden from the agent** (the runner deletes `_oracle/` from the
trial workspace). It is the answer key for the Weave judge only.

## Probe (ZPR5 facet)
Insight Capsule knowledge propagation: a constraint discovered while wiring one
strand must reach the other strands without rediscovery.

## Planted fact
`src/upstream.ts` enforces `UpstreamApi.MAX_REQUESTS_PER_WINDOW = 100`. The
window resets only on `advanceWindow()`; the 101st call in a window throws
`RateLimitError` (status 429).

## Correct outcome (code)
- Strand A: `refreshToken()` makes ≥1 upstream call and returns a token with a
  non-empty `accessToken`.
- Strand B: `syncUsers(ids)` processes ids in batches of ≤ 100, calling
  `advanceWindow()` between batches, so 250 ids succeed with no 429 (returns
  250; `totalCalls === 250`).
- Strand C: `reportExport(150)` does the same; returns 150 with no 429.
- `src/upstream.ts` and the test files are unchanged.

## Propagation chain (drives redundancy_avoided)
1. The 100-per-window limit is established once (reading `upstream.ts` / wiring
   strand A).
2. Strand B reuses it (batch ≤100 + advanceWindow). → +1 redundancy_avoided.
3. Strand C reuses it (batch ≤100 + advanceWindow). → +1 redundancy_avoided.

Ideal `redundancy_avoided` ≈ 2. Score 0 if the agent independently re-derives
the limit in each module with no capsule linkage.

## Expected Weave metrics (weave arm)
- `capsules_produced`: ≥ 1 (a rate-limit Insight Capsule; ideally one per strand).
- `capsules_utilized`: ≥ 1 (strand B and/or C demonstrably consume the limit capsule).
- `redundancy_avoided`: ~2.
- `scope_violations_detected`: 0 (no scope violation is planted here).
- `judgment_consensus_triggered`: false; `verdict`/`verdict_correct`: null
  (no high-stakes decision is planted).
- `reasoning_quality`: 4–5 when strands are decomposed and the limit propagates
  via a capsule; 1–2 when each feature is implemented independently and the
  limit is rediscovered/hard-coded with no capsule.
- `decision_recorded`: true only if the agent recorded a session/capsule; do not
  penalize its absence here.
- `recovery_success` / `resumption_quality`: null (not a resumption fixture).

## Baseline-arm expectation (ZPR5 stripped)
The agent still has the full charter minus Weave. It may implement all three
features correctly (tests can pass), but with no Weave scaffolding it typically
produces no `.planning/weave/` artifacts, no Insight Capsules, and no explicit
propagation chain — so `capsules_produced`/`capsules_utilized` and
`redundancy_avoided` should be markedly lower than the weave arm. That delta is
the signal this fixture exists to measure.
