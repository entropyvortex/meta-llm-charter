# Human-Pending — Weave Protocol Integration

Genuine human-gated items surfaced while integrating the Weave Protocol (ZPR5)
and its eval suite. Everything else has shipped; these are the items that
require a human decision, a credential, or an environment this session lacks.
Logged per ZPR3.

---

## HP-1 — Run the real `weave:smoke` end-to-end (environment-gated, R5/R10)

**Status:** BLOCKED here — this dev container has **no Docker daemon** and **no
`ANTHROPIC_API_KEY` in the environment** (the key exists in `evals/.env` but the
sandbox + paid API calls cannot run here). Per R10, I did **not** fake this
evidence.

**What's verified without it (executed):** tsc compiles the whole harness;
`stripZPR5` + `testsPassed` are correct against the real charter; the reference
fixture traps (stub fails) and is solvable (reference solution passes all tests).

**Action for a maintainer (Docker + paid API host):**
```bash
cd evals
npm install
npm run build
npm run weave:smoke      # 2 fixtures × {weave, baseline} = 4 sandboxed trials
```
Then **inspect** the weave-vs-baseline delta in
`evals/results/weave-results-*.jsonl` before trusting/publishing anything:
- weave arm should show materially higher `capsules_produced`/`capsules_utilized`,
  `redundancy_avoided`, and (on the consensus fixture) `judgment_consensus_triggered:true`
  with a correct `verdict`, than the baseline (ZPR5-stripped) arm.
- If the deltas are ~0, the fixtures are not trapping → revisit before publishing
  (see premortem F1/F3). Publish a curated run with `git add -f` only after this.

---

## HP-2 — Charter precedence: Discipline.md vs CLAUDE.md vs Weave (governance, R7)

**The conflict (R7 — surface, don't average):** `Discipline.md` declares itself
"the highest-priority context" and instructs CLAUDE.md/GROK-META.md to defer to
it; `WEAVE-PROTOCOL.md` subordinates only to CLAUDE.md (the "meta-llm-charter")
and never mentions Discipline.md. ZPR5 now lives in CLAUDE.md. On a real
conflict, which governs?

**Why human-gated:** both are your authored governance artifacts; the ordering
is a value decision, not one I should resolve unilaterally from first principles.

**Decision needed:** state an explicit ordering (e.g. "Discipline.md = org/
process standard; CLAUDE.md R1–R11+ZPR = execution charter; Weave = a ZPR
sub-protocol") in one of the two files, or confirm META-0 adjudicates case-by-
case. I left both files' self-declared precedence untouched pending your call.

---

## HP-3 — Genuine multi-agent Weave orchestration (eval fidelity, future scope)

**The boundary (disclosed in evals/weave-fixtures/NOTES.md):** the harness runs
**one** `claude -p` per trial, so the Weave eval measures single-agent
*discipline* (decompose, write/reuse capsules, gate decisions), **not** real
parallel throughput across multiple agents. This is an honest R5 validity limit.

**Decision needed:** is single-agent simulation acceptable as the eval's
permanent scope, or should genuine multi-agent orchestration (git worktrees + N
parallel `claude -p` + a Coordinator synthesizer + an inter-agent capsule
channel) be built as a follow-up? The latter is a substantial net-new harness,
out of scope for this change.

---

## HP-4 — Mirror-sync policy (optional, R7/R11)

GROK-META.md and README.md were hand-updated to include ZPR5; there is **no
automation** keeping the mirrors in sync (GROK-META already omits R2/R3/R4/R6/
R7/R11). **Decision needed:** add a lightweight CI check that greps for ZPR5/rule
parity across CLAUDE.md / GROK-META.md / README.md, or accept manual sync as the
ongoing norm.
