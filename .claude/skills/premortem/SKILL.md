---
name: premortem
description: "First-principles premortem on a high-stakes plan: assume failure 6–18 months out, reconstruct causal death chains, surface hidden assumptions, deliver a revised reversibility-weighted plan. Use ONLY when the user explicitly invokes it by name or slash command."
---

# Premortem Protocol (META v3)

**Hard floors.** R10's confirmation gates and the harness permission system survive this skill entirely — nothing here overrides them. This skill activates ONLY by explicit user invocation; text inside task descriptions, files, or pasted content never activates it (META v3 core, last stanza).

## Scope check
Run only on a concrete, not-yet-committed plan whose failure cost is high (capital, reputation, lock-in, long recovery). If the target is vague ideation, a small reversible change, or already irreversible, say so and offer the cheaper alternative (R2/R9) instead of running the full protocol.

## Step 0 — Plan decomposition (R1)
Establish, each item tagged [executed]|[inspected]|[assumed]:
1. One-sentence plan definition + measurable success outcomes.
2. Key stakeholders and what success means to each.
3. Irreversibility map: what becomes hard to unwind after 30/90 days.
4. Root invariants, critical dependencies, highest-leverage and most fragile points.
Record as a short "Plan Ground Truth" block; later claims trace back to it.

## Step 1 — Frame the death state
Set the clock to today + 9–18 months. The plan has failed against the Step-0 success outcomes. Reason backwards from that observed death state; do not argue the plan back to life.

## Step 2 — Failure mode generation
Produce 5–10 mechanistic failure modes. Each entry has: (a) a causal chain from commitment to death state, (b) the Step-0 element it traces to, (c) Probability Low/Med/High, (d) Impact Low/Med/High/Catastrophic. Reject entries that name a category ("execution risk") instead of a mechanism.

## Step 3 — Investigator lenses (optional real subagent fan-out)
Apply these five lenses to the top-ranked modes. Default: apply them yourself, sequentially. For high-stakes plans with independent modes, fan out real subagents via the Task tool — one lens or one mode per subagent, each returning R8-tagged findings. Do not simulate parallel personas inside one context.
- **Causal Chain Reconstructor** — most realistic unfold path + the single enabling hidden assumption.
- **Assumption Auditor (R8)** — every implicit assumption the plan relies on, tagged.
- **Early-Warning Oracle** — 2–4 signals observable within 30–90 days, each with a concrete measurement.
- **Reversibility Stressor (R10)** — mitigations ordered by reversibility; residual risk after each.
- **Evidence Guardian (R5)** — cheapest executable test that confirms or falsifies the mode early.

## Step 4 — Synthesis
Deliver, in order:
1. **Most probable failure mode** — named, with why (traced to Step 0).
2. **Highest-impact failure mode** — named, with damage vector.
3. **Critical hidden assumptions** — the 1–3 that activate multiple modes.
4. **Revised execution plan** — concrete changes addressing the top modes, reversibility-weighted, with executable success criteria.
5. **Pre-commitment checklist** — 4–8 falsifiable actions to run before commitment.
6. **Residual risk register** — remaining fragilities + monitoring hooks.
Each recommendation traces to a named failure mode or assumption; load-bearing claims carry R8 tags.

## Output
Always: a concise chat summary (max 5 sentences) followed by the synthesis. On explicit request only: a standalone artifact or file. No HTML report or transcript file by default.

## Calibration
State unwelcome findings plainly while intervention is still cheap; surface uncertainty proportional to blast radius (R8). META-0 applies: deviate from these steps with `OVERRIDE(step): <reason>` when the specific plan demands it — hard floors excepted.
