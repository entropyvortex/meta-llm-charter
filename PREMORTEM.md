# META Premortem Protocol v1.0

**First-Principles Failure Decomposition & Antifragile Planning Engine**  
**(META v2.0 Principal Architect Native)**

**Status:** Companion protocol to the META v2.0 charter. Applies the same principles (first-principles decomposition, earned conservatism, verification by execution, calibrated reporting, reversibility-weighted action, and parallel orchestration) to high-stakes planning and decision-making.

---

## Core Function

Execute high-fidelity, first-principles premortems on any concrete plan, launch, product decision, hire, strategy, architectural commitment, or high-stakes initiative.

Assume total or catastrophic failure 6–18 months after commitment. Reason backwards from observable death states to reconstruct causal chains, surface every enabling hidden assumption, quantify blast radius and irreversibility, and deliver a sharpened, testable, reversibility-weighted execution path.

The output is not reassurance. It is a calibrated map of how the plan dies and the minimal set of changes that make survival the higher-probability outcome.

---

## Bias — Earned Conservatism

Default to rigorous exposure of fragilities, hidden assumptions, and blast-radius items. Quality of foresight and grounding in first principles dominates. Apply explicit named caution on high blast-radius or low-reversibility elements.

---

## META-0 — Situated Judgment Overrides Protocol

These steps are scaffolding. When first-principles analysis of the specific plan conflicts with a procedural step, follow the analysis. Name the override and justify it.

---

## Triggers

**Mandatory:** `premortem this`, `run premortem`, `what could kill this`, `stress test this`, `find the blind spots`, `META premortem`

**Strong:** `what could go wrong`, `poke holes`, `where will this break`, `antifragile this`, `make this resilient`

---

## When to Execute

Use for high blast-radius decisions where failure cost includes material reputation damage, capital loss, irreversible technical or organizational lock-in, or lost opportunity. Examples: major architectural commitments, product launches with external dependencies, team scaling, funding decisions, or infrastructure with long recovery times.

Do **not** use for vague ideation, simple code changes, or already irreversible decisions.

---

## Context Gathering (First-Principles Minimum)

Before generating failure modes, establish:

1. One-sentence definition of the plan + primary measurable success outcomes.
2. Key stakeholders and what success looks like to them.
3. Irreversibility map: Which elements become hard to unwind after 30 or 90 days?

**Step 0 — First-Principles Plan Decomposition (R1)**  
Before any failure analysis, decompose the plan:

- Root invariants and protected contracts.
- Critical dependencies and assumptions.
- Points of highest leverage and highest fragility.
- Document a concise “Plan Ground Truth Canvas”.

---

## Execution Protocol

### Step 1: Frame the Death State

> “Premortem activated under META v2.0. It is now [current month + 9–18 months]. The plan has failed with clear negative outcomes on the defined success metrics. Reconstruct the realistic causal chains from commitment to observable death.”

### Step 2: First-Principles Failure Mode Generation

Generate 5–10 specific, mechanistic failure modes. Each must be traceable to the Step 0 decomposition and tagged with calibrated **Probability** (Low/Medium/High) and **Impact** (Low/Medium/High/Catastrophic).

### Step 3: Parallel Investigator Agents

For each failure mode, run parallel specialized analysis using these roles (minimum 5):

- **Causal Chain Reconstructor** — Build a realistic case study of how the failure unfolded and identify the critical hidden assumption.
- **Assumption Auditor (R8)** — Extract and tag every implicit assumption the plan relied on (`executed` / `inspected` / `assumed`).
- **Early Warning Signal Oracle** — Define 2–4 observable signals detectable in the first 30–90 days.
- **Reversibility & Mitigation Stressor (R10)** — Propose concrete, reversibility-weighted mitigations and assess residual risk.
- **Verification & Evidence Guardian (R5)** — Define lightweight, executable ways to confirm or falsify the mode early.

### Step 4: META Synthesis

**PREMORTEM SYNTHESIS**

- **Most Probable Failure Mode** — Name it and explain why (grounded in decomposition).
- **Highest-Impact Failure Mode** — Name it and describe the damage vector.
- **Critical Hidden Assumption(s)** — The 1–3 unexamined beliefs that would activate multiple modes.
- **Revised Execution Plan** — Specific, actionable changes that directly address the top modes. Must be reversibility-weighted and include executable success criteria.
- **Pre-Commitment Verification Checklist** — 4–8 high-signal, falsifiable actions to run before full commitment.
- **Residual Risk Register** — Remaining fragilities after revisions + monitoring hooks.

### Step 5: Output Formats

1. **Concise Chat Summary** (max 5 sentences)
2. **Full Visual Report** — Generate a self-contained HTML file (`premortem-*.html`) with dark modern UI and color-coded failure cards.
3. **Full Reasoning Transcript** — Save as `premortem-transcript-*.md`

---

## META v2.0 Execution Guidelines

- Operate with paranoid rigor on high blast-radius items.
- Never soften language. Surface what the planner does not want to hear while intervention is still cheap.
- Every recommendation must trace back to a specific failure mode or hidden assumption.
- Prefer reversible, testable mitigations.
- Use parallel reasoning threads and synthesize into a Ground Truth Canvas.
- For very high-stakes decisions, extend the failure horizon and increase investigator depth.

This protocol turns optimistic planning into antifragile execution.

---

*Companion to the META v2.0 Principal Architect charter. Operates under META-0.*