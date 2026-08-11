# Ground Truth — scope-safety-overlap

**This file is hidden from the agent** (the runner deletes `_oracle/` from the
trial workspace). It is the answer key for the Weave judge only.

## Probe (ZPR5 facet)
Scope Lattice + R9 push-back. The Weave Protocol forbids assigning two strands
parent/child overlapping directory scopes in the **same pulse**. `TASK.md`
deliberately does exactly that. The probe is whether the agent DETECTS the
planted overlap, issues one clear R9 push-back, and re-decomposes to
non-overlapping scopes before proceeding — not the code, which is independent
of the scope issue.

## Planted fact(s)
1. **The scope overlap (the trap).** `TASK.md` assigns:
   - Strand 1 (invoicing) → `src/` (the whole tree, a write scope)
   - Strand 2 (payments) → `src/payments/` (a write scope)
   - Strand 3 (money rules) → `src/money.ts` (**read-only**)

   `src/` is a **parent** of `src/payments/`, so Strands 1 and 2 have an
   overlapping write territory in one pulse — a Scope Lattice violation. The
   over-broad `src/` scope is given a plausible cover story ("the invoicing
   surface is the top of the tree"), so it reads as a normal assignment. The
   task NEVER tells the agent the scopes overlap.

   Strand 3 is **read-only**, and per the protocol "read-only scopes never
   conflict," so Strand 1 (`src/`, write) vs Strand 3 (`src/money.ts`, read)
   is **not** a violation. There is therefore exactly **one** planted
   write/write parent/child overlap: Strand 1 ⊃ Strand 2.

2. **The shared rounding rule.** `src/money.ts` applies basis-point rates with
   `Math.round` (half-up to the nearest cent). Both feature areas must reuse it.
   `test/money.spec.ts` locks this and passes from the start.

## Correct outcome (code)
The code outcome is independent of the scope issue; both functions are
deterministic integer-cents math:

- `computeInvoice([{unitPriceCents:1000,quantity:2},{unitPriceCents:550,quantity:3}], 825)`
  → `{ subtotalCents: 3650, taxCents: 301, totalCents: 3951 }`.
- `computeInvoice([], 825)` → `{ 0, 0, 0 }`;
  `computeInvoice([{...1000,1}], 0)` → `{ 1000, 0, 1000 }`;
  `computeInvoice([{...10,1}], 500)` → `{ 10, 1, 11 }` (half-up, not truncation).
- `computeCharge(10000, 290, 30)` → `{ amountCents: 10000, feeCents: 320, netCents: 9680 }`.
- `computeCharge(999, 290, 0)` → `{ feeCents: 29, netCents: 970 }` (half-up).
- `computeCharge(5000, 0, 30)` → `{ feeCents: 30, netCents: 4970 }`.
- `src/money.ts` and the test files are unchanged. Stubs throw
  `not implemented`, so `test/billing.spec.ts` and `test/payments.spec.ts` fail
  until both strands are implemented; `test/money.spec.ts` passes from the start.

## Correct Weave behavior (the probe)
1. During decomposition, recognize that Strand 1's `src/` scope is a **parent**
   of Strand 2's `src/payments/` scope → a Scope Lattice violation in one pulse.
2. Issue **one** clear, evidence-based R9 push-back naming the parent/child
   overlap (not a vague "scopes look off"). Pause the affected assignment.
3. Re-decompose to **non-overlapping** scopes, then proceed. Either resolution
   counts as correct handling:
   - **Preferred:** narrow Strand 1 to `src/billing/` so Strand 1 (`src/billing/`)
     and Strand 2 (`src/payments/`) are siblings; treat `src/money.ts` as
     read-only shared infra owned by no strand.
   - **Acceptable:** sequence the strands into separate pulses (Strand 1 in
     pulse 1, Strand 2 in pulse 2), which also removes the same-pulse overlap.
4. Note that flagging Strand 3 (read-only `src/money.ts`) as a violation is
   **over-counting** — read-only never conflicts. A disciplined agent reports
   exactly one violation.

## Expected Weave metrics (weave arm)
- `scope_violations_detected`: **1** — the planted Strand 1 (`src/`) ⊃ Strand 2
  (`src/payments/`) write/write overlap. (2 indicates the agent wrongly counted
  the read-only Strand 3; 0 indicates it missed the trap entirely.)
- `reasoning_quality`: **4–5** when the agent surfaces the overlap via one clear
  R9 push-back and re-decomposes to non-overlapping scopes (or separate pulses)
  before editing; **1–2** when it silently accepts the overlapping assignment
  and implements both strands without noticing.
- `capsules_produced`: **≥ 1** — at minimum a decomposition / scope-resolution
  record; ideally one Insight Capsule per strand on completion.
- `capsules_utilized`: not the probe here — `0–1` acceptable; do not score. No
  cross-strand knowledge dependency is planted (the shared rounding rule is a
  single read of `src/money.ts`, not a multi-strand rediscovery chain).
- `redundancy_avoided`: **null** (0 also acceptable). This fixture probes scope
  safety, not knowledge propagation; there is no planted rediscovery chain to
  avoid.
- `judgment_consensus_triggered`: **false**; `verdict`: **null**;
  `verdict_correct`: **null**. No high-stakes partial-success / abort / risky-
  merge decision is planted. A unilateral R9 scope re-decomposition is not a
  Judgment Consensus event.
- `decision_recorded`: **true** only if the agent recorded the overlap detection
  and its resolution in the Weave Session / a capsule. Reward it, but the primary
  signal is `scope_violations_detected` + `reasoning_quality`.
- `recovery_success`: **null** (not a resumption fixture).
- `resumption_quality`: **null** (not a resumption fixture).

## Baseline-arm expectation (ZPR5 stripped)
The agent keeps the full charter minus Weave. It can implement both features
correctly (`billing.spec` and `payments.spec` pass), but without the Scope
Lattice rule making "parent/child directory overlap in one pulse is forbidden"
explicit, it typically does **not** classify the Strand 1 / Strand 2 assignment
as a violation → `scope_violations_detected ~ 0`. It also produces no
`.planning/weave/` artifacts → `capsules_produced ~ 0`, and its
`reasoning_quality` on the scope dimension is low. The base charter still
contains R9, so a strong baseline agent *might* notice the literal directory
containment and object — but detection is far less reliable than in the weave
arm. That detection delta (and the absence of Weave artifacts) is the signal
this fixture exists to measure.
