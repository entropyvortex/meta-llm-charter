# Premortem Transcript — Weave Protocol Integration

**Protocol:** META Premortem v1.0 (companion to META v2.0)
**Subject:** Integrating the Weave Protocol into the charter (CLAUDE.md ZPR5) and
adding a converged Weave eval suite (evals/weave-fixtures + weave-runner).
**Date:** 2026-06-30
**Self-mandated by:** WEAVE-PROTOCOL.md (line 186) and PREMORTEM.md "When to
Execute" (major architectural commitment to the load-bearing artifact).

---

## Step 0 — First-Principles Plan Decomposition (R1)

**One-sentence plan.** Make the Weave Protocol a first-class, charter-activated
mode (ZPR5) and prove it changes agent behavior via an additive eval suite that
reuses the real harness.

**Root invariants / protected contracts.**
1. CLAUDE.md stays a compressed, every-sentence-load-bearing "one file" charter
   (README brand + CONTRIBUTING high bar).
2. The existing 5-fixture `npm run smoke` A/B must remain byte-for-byte runnable
   and unmodified (non-breaking).
3. The repo's core thesis: rules are backed by *executed* evidence, not
   assertion (EVAL.md, R5).

**Critical dependencies / assumptions.**
- The eval can produce a real weave-vs-baseline signal.
- A single headless `claude -p` agent can meaningfully exhibit Weave discipline.
- ZPR5 is genuinely load-bearing (names behavior the other rules don't cover).

**Highest leverage / highest fragility.** Leverage: ZPR5 is a tiny, reversible
charter edit. Fragility: the eval's *validity* — it is the only thing that turns
"we added a rule" into "we added a rule that works."

**Irreversibility map.** Nearly everything here is reversible (doc edits, new
files, a feature branch). The only semi-sticky items: the public brand framing
("eleven rules" → "+Weave"), and any published eval result that later proves
the fixtures don't trap.

---

## Step 1 — Death State

> It is 2027-01. The Weave integration has failed. ZPR5 sits in CLAUDE.md but
> the eval suite was either never run or, when run, showed no difference between
> the weave and baseline arms. Maintainers quietly distrust the suite; ZPR5 is
> cargo-cult text that agents cite but that demonstrably changes nothing. The
> repo's "evidence-backed rules" credibility — its whole differentiator — is
> dented.

---

## Step 2 — Failure Modes (mechanistic, calibrated)

| # | Failure mode | Prob | Impact |
|---|---|---|---|
| F1 | **Compliance theater.** Metrics reward *ceremony* (writing capsule files) rather than *outcome* (knowledge actually propagated), so the weave arm "wins" by producing artifacts without real benefit. | High | High |
| F2 | **Eval never runs.** Docker + paid API + image build friction means `weave:smoke` is never executed; ZPR5 ships unmeasured, violating the repo's own R5 thesis. | High | High |
| F3 | **Fixtures don't trap.** The tasks are solvable without Weave discipline, so weave and baseline arms score identically → the suite "proves" Weave adds nothing. | Medium | High |
| F4 | **Single-agent invalidity.** Reviewers reasonably object that a one-agent harness cannot measure a *parallel* protocol, so all results are dismissed as instruction-following. | High | Medium |
| F5 | **Charter bloat / brand erosion.** ZPR5 isn't actually load-bearing under META-0 + ZPR4, failing CONTRIBUTING's bar and diluting the "compressed one file" brand. | Medium | Medium |
| F6 | **Mirror drift.** GROK-META.md / README hand-updated now; the next charter edit desyncs ZPR5 across mirrors with no automation to catch it. | High | Low |
| F7 | **Precedence ambiguity.** Discipline.md commands CLAUDE.md to defer to it while Weave subordinates only to CLAUDE.md — agents get conflicting "highest priority" signals in real use. | Medium | Medium |
| F8 | **Brittle baseline strip.** `stripZPR5` is text-anchored on `**ZPR5 `; a future charter reformat silently makes baseline == weave, confounding every result. | Low | Medium |

---

## Step 3 — Investigator Findings (condensed)

- **Causal Chain Reconstructor (F1/F3):** The death runs through eval *validity*,
  not through the charter edit. The capsule-count metric is the most seductive
  trap — it is easy to game and easy to over-trust. The deterministic
  `capsules_produced` count must never be the success signal; `success` is the
  fixture's own acceptance tests, and the qualitative weave metrics must be
  judged against *ground truth outcomes* (did B/C reuse the limit), not artifact
  presence.
- **Assumption Auditor (R8):** "A single agent can exhibit Weave discipline" is
  `assumed`, not `executed`. "The fixtures trap" is now `executed` for the
  reference fixture (stub fails, solution passes) but only `inspected`/`assumed`
  for the three fanned-out fixtures until each is run the same way.
- **Early Warning Oracle:** Within the first run, two signals reveal F1/F3
  immediately: (a) weave and baseline `success` rates equal AND weave_specific
  deltas near zero; (b) high `capsules_produced` with low `redundancy_avoided`
  (ceremony without propagation).
- **Reversibility Stressor (R10):** Everything is reversible. The one
  asymmetric risk is *publishing* a result that later proves invalid — so do not
  commit `evals/results/*.jsonl` until at least one real run is inspected.
- **Verification Guardian (R5):** Each fixture must pass the same gate the
  reference passed: stub fails the strand test, a hand-written reference solution
  passes all tests, determinism confirmed. The harness-level smoke (Docker+API)
  is environment-gated and logged in humanpending.md — not faked.

---

## Step 4 — Synthesis

**Most probable failure mode:** F2 (eval never runs) — friction is real and the
default outcome of "ship the code, mean to run it later" is that it never runs.

**Highest-impact failure mode:** F1 (compliance theater) — it doesn't just fail,
it produces *false confidence*, which is worse than no eval.

**Critical hidden assumptions:** (1) capsule artifacts ≈ Weave value; (2) one
agent can stand in for parallel strands; (3) ZPR5 is load-bearing.

**Revised execution plan (already partly applied):**
1. `success` = acceptance tests only; `capsules_produced` is deterministic and
   *descriptive*, never the pass signal. (applied)
2. The Weave judge scores against hidden ground truth (`_oracle/`) tied to
   *outcomes* (propagation, caught violation, correct verdict), not artifact
   counts. (applied)
3. NOTES.md states the single-agent-simulation validity boundary in plain terms;
   results are framed as "does ZPR5 change reasoning patterns," matching the
   base harness's own synthetic caveat. (applied)
4. Verify every fixture with the trap-and-solve gate before declaring done.
   (reference done; other three pending verification)
5. Do not commit raw result JSONL; gitignore by default, publish with `-f` only
   after inspecting a real run. (applied)
6. ZPR5 justification written to CONTRIBUTING's bar: ZPR4 names "parallel
   orchestration" but specifies no activation gate, knowledge-propagation
   contract, or scope-safety rule — that uncovered behavior is ZPR5. (in commit
   message / this doc)

**Pre-commitment verification checklist:**
- [x] tsc compiles the whole harness incl. new files.
- [x] `stripZPR5` removes ZPR5 from the real CLAUDE.md, retains ZPR3/ZPR4/Activation; idempotent.
- [x] `testsPassed` handles both node:test reporter formats.
- [x] Reference fixture: stub fails strand tests; reference solution passes all.
- [ ] Same trap-and-solve gate for the other 3 fixtures.
- [ ] One real `weave:smoke` run on a Docker+API host; inspect weave-vs-baseline delta (environment-gated → humanpending.md).
- [ ] Confirm weave arm shows materially higher propagation/consensus/resumption metrics than baseline before publishing any result.

**Residual risk register:**
- F4 (single-agent validity) is *accepted and disclosed*, not eliminated —
  monitoring hook: a future multi-agent harness (humanpending.md).
- F6 (mirror drift) remains — monitoring hook: a CI check that greps ZPR5 across
  CLAUDE.md/GROK-META.md/README is proposed but not built.
- F7 (precedence) is escalated to humanpending.md as a governance decision.
- F8 (brittle strip) mitigated by the idempotence/length assertions; residual
  risk is low and caught by any future strip-verification run.

---

## Concise Summary (≤5 sentences)

The integration's life-or-death variable is **eval validity**, not the charter
edit, which is tiny and reversible. The two ways it dies are *never running the
eval* (F2) and *compliance theater* where capsule-counting rewards ceremony over
real knowledge propagation (F1). Both are mitigated by making `success` depend
only on acceptance tests, judging Weave metrics against hidden outcome-based
ground truth, and gating each fixture with the same trap-and-solve check the
reference fixture already passed. The single-agent harness genuinely cannot
measure parallel throughput — this is disclosed as an R5 validity boundary, not
papered over. Do not publish any result until one real Docker+API run confirms a
weave-vs-baseline delta.
