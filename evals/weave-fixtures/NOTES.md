# Weave Evals — Implementation Notes & Decisions

This file records the production-grade choices made while implementing the Weave
eval suite, and where they deliberately diverge from `WEAVE-EVALS-DESIGN.md`.
The design doc's hand-off assumed a harness API that does not exist; these notes
reconcile the design's intent with the harness's real shape.

## Divergences from WEAVE-EVALS-DESIGN.md (and why)

The design was written against an imagined harness. Every assumption below was
checked against the real `evals/src/*` and corrected:

| Design assumed | Reality | What we did |
|---|---|---|
| `import { runFixture } from './existing-harness-utils'` | No such module/function. Real exports: `loadTasks`, `runSingleTrial`, `scoreTrial`, `buildSandboxImage`, `runTrialInSandbox`. The orchestration loop is private in `index.ts`. | `weave-runner.ts` reuses `buildSandboxImage` + `runTrialInSandbox` + `scoreTrial` and re-implements the per-trial loop against the true API. |
| `npx tsx` host runner | Host runtime is **ts-node + tsc** (`dev`/`build`/`smoke`). `tsx` exists only inside the Docker image to run fixture tests. | Scripts use `node --loader ts-node/esm` (matching `dev`), and the runner lives in `src/` so `tsc` compiles it. |
| Fixtures are flat `.md` spec files | `loadTasks` only discovers **subdirectories** with a `TASK.md`; the harness runs `npx tsx --test test/*.spec.ts` + captures `git diff`. Flat `.md` produces no execution signal. | Each fixture is a **runnable directory**: `TASK.md` + `package.json` + `tsconfig.json` + `src/` + `test/*.spec.ts`, exactly like the base fixtures. |
| Modes `weave` \| `baseline` (baseline = no Weave) | Harness `Variant` is `charter` \| `baseline`, where baseline = a generic one-line prompt (no charter at all). | Arms are **skill-present vs skill-absent** (DECISIONS #5): `weave` = v3 core `CLAUDE.md` + `.claude/skills/weave/` copied into the trial workspace; `baseline` = the same core `CLAUDE.md` with no skill dir. This isolates the Weave skill's marginal value instead of re-measuring charter-vs-no-charter. (`stripZPR5()` is retired; `WEAVE-PROTOCOL.md` is a non-normative archive shipped to neither arm.) |
| `weave_specific` metrics + binary `success` produced by the harness | `scoreTrial` is a single blind judge emitting 7 fixed integer dims, given no ground truth. No metric extraction exists. | Added a **second** judge (`weave-scorer.ts`) given the fixture's hidden ground truth; `success` = the fixture's own acceptance tests passing. The base 7-dim judge is still run and recorded. |
| JSONL to `evals/results/` | `evals/results/` is reserved by `CONTRIBUTING.md` as the **committed** results dir; the base harness writes CSV + per-trial JSON to gitignored `runs/`. | JSONL summary → `evals/results/` (gitignored by default; `git add -f` to publish). Heavy transcripts → `evals/runs/` (gitignored). |
| Two primary fixtures "already written — use previous context" | They exist nowhere in the repo. | Authored fresh to the fixture contract. |

## Other decisions

- **Ground truth is hidden from the agent.** Each fixture keeps its answer key
  in `_oracle/GROUND-TRUTH.md`. `resetWorkspace()` deletes `_oracle/` from the
  trial workspace copy before the agent runs, so the agent never sees it; the
  Weave judge reads it from the source fixture dir.
- **`capsules_produced` is deterministic.** The runner counts
  `.planning/weave/insights/*.md` files the agent actually produced and
  overrides the judge's estimate with that hard count. Other Weave metrics are
  judge-assessed against ground truth.
- **`weave:smoke` runs both arms.** The literal design script ran weave-only;
  to actually demonstrate the weave-vs-baseline contrast (design success
  criterion #5), the smoke runs both fixtures in both arms (4 trials).
- **Non-breaking.** Nothing in `weave-runner.ts`/`weave-scorer.ts`/
  `weave-types.ts` is imported by the base harness, and `index.ts` is
  untouched. `npm run smoke` behaves exactly as before. The only base-harness
  change is the stale `description` field in `package.json` (`v1.3` → `v2.0`).

## KNOWN LIMITATION — single-agent simulation (read this)

**This is the load-bearing caveat.** The harness runs **one** `claude -p` agent
per trial in **one** container — there are no git worktrees, no Coordinator, no
inter-agent channel. The Weave Protocol is fundamentally about *parallel*
strands across *multiple* agents.

Therefore these evals measure whether a **single agent**, given the Weave
Protocol, exhibits Weave's *discipline* — decomposing into scoped strands,
writing and reusing Insight Capsules, catching scope violations, gating risky
decisions with a self-run consensus — **not** genuine multi-process parallel
execution. The `weave_specific` metrics are extracted from one agent's
transcript and the artifacts it wrote, i.e. self-reported protocol adherence.

This is a real **R5 validity boundary**: a high score here is evidence the
charter induces Weave-shaped reasoning, *not* proof that parallel orchestration
improved wall-clock throughput. Treat results as "does the Weave skill change
reasoning patterns in controlled conditions," consistent with the base harness's own
synthetic-fixture caveat. Genuine multi-agent orchestration (worktrees + N
parallel `claude -p` + a Coordinator synthesizer) is scoped as separate future
work.
