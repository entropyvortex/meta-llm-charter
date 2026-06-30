# Weave Protocol

**Version**: 0.2 (Charter-Integrated — mechanics appendix to CLAUDE.md ZPR5)  
**Status**: Active — Charter-Native Parallel Execution Protocol (activated by ZPR5)  
**Activation Keywords**: "Weave Protocol", "activate Weave", "Weave mode", "parallel Weave", "Weave Strand"

---

## Purpose

The Weave Protocol provides a disciplined, charter-aligned method for orchestrating **parallel execution** across multiple specialized agent strands while preserving continuous forward momentum, preventing redundant discovery, maintaining scope safety, and ensuring all progress remains auditable and synthesizable under META-0 judgment.

It operationalizes the Zero-Pause principle of parallel ASI orchestration (minimum 7 specialized threads when scope justifies) without requiring heavy runtime infrastructure. The protocol is expressed primarily through agent instructions, structured outputs, and lightweight shared state conventions that any Claude Code, Cursor, or compatible agent can follow.

**Core Thesis**: Multiple disciplined principal engineers working in parallel strands can achieve higher throughput than sequential execution *if and only if* knowledge propagates cleanly, scope conflicts are prevented by design, and high-stakes decisions remain under explicit judgment (human or META-0).

---

## When to Activate Weave

Activate Weave when **all** of the following hold:

1. The task naturally decomposes into **3 or more independent or loosely-coupled lines of work** (e.g., backend + frontend + tests + docs, or multiple modules with clear boundaries).
2. File/directory scopes can be assigned without significant parent-child overlap in the same pulse.
3. The value of parallel throughput outweighs the coordination overhead (reversible decision — favor activation on medium+ scope work).
4. You are willing to maintain a lightweight shared session state and propagate Insight Capsules.

**Do not activate** for:
- Single-file or tightly-coupled changes (use direct single-strand execution).
- Highly speculative or research-heavy work better suited to sequential premortem + exploration.
- Situations where human gating is expected on almost every step (use humanpending.md directly).

**META-0 Override**: If first-principles analysis shows that parallel execution would create unmanageable coupling or hidden shared-state risks, do not activate even if criteria appear met. Name the override.

---

## Foundational Principles (Tied to Charter)

The Weave Protocol is subordinate to the core meta-llm-charter (R1–R11 + META-0 + ZPR). Key alignments:

- **R1 First-Principles Decomposition**: Every Weave activation begins with explicit decomposition of the work into independent strands.
- **R4 Bounded Refactoring & Scope Control**: Scope claims are strict. Strands must not cross assigned boundaries without explicit re-decomposition.
- **R5 / R8 Reproduction, Verification & Evidence Tagging**: All claims in Insight Capsules and Continuity Markers must be tagged `(executed)`, `(inspected)`, or `(assumed)`. Verification steps are mandatory before merging progress.
- **R9 One Clear Push-back**: Any strand that detects a flawed premise or scope violation issues **one** clear, evidence-based push-back and pauses its work on that item.
- **R10 Reversibility-Weighted Boldness**: Parallel work increases blast radius. Favor reversible changes within strands; escalate irreversible decisions to Judgment Consensus or human.
- **META-0**: All automated elements (scope rules, capsule propagation, judgment consensus) are scaffolding. Human or higher judgment can override with named justification.
- **Zero-Pause (ZPR)**: Weave exists to enable **continuous unbroken forward momentum** across parallel strands. No artificial serialization. Knowledge flows forward via Insight Capsules so later strands do not rediscover what earlier strands already established.

---

## Core Concepts & Terminology

| Concept              | Definition                                                                 | Replaces (Conceptual) |
|----------------------|----------------------------------------------------------------------------|-----------------------|
| **Weave**            | The overall parallel execution protocol and session                        | Fleet                 |
| **Strand**           | One parallel line of work executed by one or more agents                   | Agent / Wave member   |
| **Pulse**            | One coordinated round of parallel strand execution + synthesis             | Wave                  |
| **Insight Capsule**  | Compressed (~400-600 token), tagged knowledge packet produced by a strand  | Discovery Brief       |
| **Continuity Marker**| Structured output block emitted by a strand to enable clean continuation   | Handoff               |
| **Weave Session**    | The single source-of-truth markdown file tracking state, queue, and shared context | Session file     |
| **Scope Lattice**    | The set of rules and claims that prevent overlapping work in one pulse     | Scope claims          |
| **Judgment Consensus**| Lightweight 3-validator process for high-stakes parallel decisions        | Consistency Voting    |
| **Weave Coordinator**| The role (human or specialized agent) responsible for pulse orchestration and synthesis | Fleet Steward    |

All terminology is chosen to feel native to a disciplined engineering charter rather than an operational harness.

---

## Weave Session File (`.planning/weave/session-{slug}.md`)

Create a dedicated Weave Session file for any activated Weave. Recommended location: `.planning/weave/session-{kebab-slug}.md`

**Minimal Structure** (evolve as needed):

```markdown
# Weave Session: {human-readable name}

**Status**: active | paused | completed | archived
**Direction**: {original request / goal}
**Activated**: {timestamp or commit}
**Coordinator**: {human or agent identity}

## Current Pulse: {N}
**Status**: in-progress | synthesizing | judgment-pending

## Strand Queue & Assignments
| # | Strand Name          | Scope (directories/files)      | Deps | Status     | Agent(s)     | Branch/Worktree | Evidence |
|---|----------------------|--------------------------------|------|------------|--------------|-----------------|----------|
| 1 | api-auth             | src/api/auth/, tests/auth/     | -    | completed  | strand-1     | feature/weave-1 | ...      |
| 2 | frontend-integration | src/frontend/, src/ui/         | 1    | in-progress| strand-2     | feature/weave-2 | ...      |
| 3 | test-harness         | tests/e2e/                     | 1,2  | pending    | -            | -               | -        |

## Pulse {N-1} Synthesis
**Key Decisions**:
- (tagged evidence)

**Shared Context** (propagated forward):
- API rate limit is 100 req/min → all downstream strands must respect this (executed)

## Insight Capsules (latest)
- `api-auth-2026-06-29.md` — JWT implementation + rate limit discovery
- `frontend-2026-06-29.md` — Client refresh token strategy

## Open Judgment Items
- (List any items requiring Judgment Consensus or humanpending)

## Archive / Completion
- Final outcome tag + link to summary when closed
```

The Weave Session is the **single source of truth**. Strands read from it and write only via Continuity Markers + Insight Capsules (append-only where possible). The Coordinator role is responsible for transcribing and maintaining the file.

---

## Strand Behaviors (Agent Instructions)

When operating inside an active Weave, every strand **must**:

1. **Read the current Weave Session** and all relevant prior Insight Capsules before beginning work.
2. **Respect Scope Lattice**: Only touch files/directories explicitly assigned to your strand in the current pulse. Parent/child overlaps in the same pulse are forbidden unless re-decomposed.
3. **Produce one Insight Capsule** at the end of your contribution (or at natural checkpoints). Capsule must be:
   - ≤ 600 tokens
   - Contain only tagged claims: `(executed)`, `(inspected)`, `(assumed)`
   - Include: what was built/changed, key decisions with rationale, discoveries, failures/blockers, and forward implications for other strands
   - Written to `.planning/weave/insights/{strand}-{timestamp}.md` (append-only naming)
4. **Emit a Continuity Marker** (structured block) at the end of your work or when handing off. Example:

   ```markdown
   ## CONTINUITY MARKER — Strand: api-auth — Pulse: 2

   **Completed**:
   - JWT middleware with jose (executed)
   - Rate limiting at 100 req/min documented (executed)

   **Open / Blocked**:
   - Token refresh strategy needs frontend coordination (assumed — see Insight Capsule)

   **Next Strand Implications**:
   - Frontend must implement refresh token handling
   - Tests should cover 15min expiry edge cases
   ```

5. **Participate in Judgment Consensus** when the Coordinator or another strand flags a high-stakes decision (partial success, risky merge, abort, scope change). Output strict JSON:

   ```json
   {
     "verdict": "proceed" | "block" | "retry",
     "reason": "One clear evidence-based sentence",
     "confidence": 0-100
   }
   ```

6. **Never write directly** to the Weave Session file or other strands' claimed scopes. Use Continuity Markers and Insight Capsules only.

7. **Apply R9 Push-back** immediately and clearly if you detect a scope violation, flawed premise, or safety issue. Then pause work on the affected item.

---

## Pulse Execution Flow (Zero-Pause)

1. **Decomposition** (Coordinator or lead strand): Explicitly break work into strands + assign scopes + identify dependencies.
2. **Pulse Launch**: Strands begin in parallel (worktrees or isolated contexts recommended where available).
3. **Execution**: Strands work continuously. Knowledge from prior pulses is injected via Insight Capsules.
4. **Capsule + Marker Emission**: Each strand produces its outputs.
5. **Synthesis** (Coordinator role): Read all new capsules/markers, update Weave Session shared context, resolve simple merges.
6. **Judgment Consensus** (if flagged): Run 3-validator process. 2/3 majority decides. Timeout = proceed (conservative bias).
7. **Next Pulse or Completion**: Either launch next pulse with updated context or close the Weave.

The flow has **no artificial pauses**. Strands keep moving. The Coordinator role (which can be a specialized agent thread or human) is the only synchronization point.

---

## Scope Lattice & Safety

**Default Rule**: In any single pulse, assigned scopes must not have parent/child directory relationships. Sibling directories are safe. Read-only scopes never conflict.

**Claim Mechanism** (lightweight): Coordinator records explicit scope claims in the Weave Session. Strands must verify their claim before editing.

**Violation Response**: Immediate R9 push-back + pause. Escalate to Judgment Consensus or humanpending.md if unresolved.

---

## Integration with Existing Charter Components

- **humanpending.md**: Use for any item that genuinely requires human decision or verification before the Weave can continue. Log with clear context from the Weave Session.
- **PREMORTEM.md**: Run a premortem on the initial decomposition and on any high-risk pulse transitions. Parallel strands increase blast radius — treat this seriously.
- **Evidence Tagging**: Mandatory in all Insight Capsules and Continuity Markers.
- **META-0**: Any automated rule (scope lattice, judgment consensus defaults, capsule format) can be overridden with named first-principles justification.
- **RoundTable / CVP** (if in use): Judgment Consensus can be implemented as a small RoundTable instance for higher confidence on critical decisions.

---

## Activation in CLAUDE.md (As Integrated)

Weave is integrated into `CLAUDE.md` as **ZPR5**, a single bold-inline sub-rule
under the Zero-Pause Execution Layer (after ZPR4, before the Activation Rule).
It deliberately conforms to the charter's conventions rather than introducing a
new top-level `## Weave Protocol Activation` heading: Zero-Pause sub-rules are
bold-inline and self-contained (never H2, never delegating their mechanics to
an external file), so ZPR5 carries the activation keywords, the activation gate,
and the core strand/Capsule/Lattice/Consensus contract inline, and names this
document (`WEAVE-PROTOCOL.md`) only as the mechanics appendix.

The charter stanza reads:

```markdown
**ZPR5 — Weave Protocol (Parallel Strand Orchestration)**
Operationalizes ZPR4 when work splits into 3+ independent lines of work with
non-overlapping file scopes and parallel throughput worth the coordination
cost. Activate on "Weave Protocol", "activate Weave", "Weave mode", "parallel
Weave", or "Weave Strand". On activation: decompose into scoped strands, record
them in a Weave Session file (.planning/weave/session-{slug}.md), and run the
strands in parallel. Each strand stays strictly inside its claimed scope (Scope
Lattice — no parent/child directory overlap within one pulse), emits a
compressed, evidence-tagged Insight Capsule plus a Continuity Marker so later
strands never rediscover what earlier ones already established, and issues one
R9 push-back on any scope or premise violation. Escalate high-stakes or
irreversible cross-strand decisions to Judgment Consensus (2/3 validators) or
humanpending.md — never silently overwrite a conflicting discovery. Mechanics
appendix: WEAVE-PROTOCOL.md. META-0 governs: if parallel execution would
create unmanageable coupling or hidden shared-state risk, name the override and
stay sequential.
```

---

## Edge Cases & META-0 Guidance

- **Single strand finishes early**: It may emit its capsule/marker and become available for re-assignment in the next pulse (Coordinator decision).
- **Conflicting discoveries** across strands: Escalate to Judgment Consensus immediately. Do not silently overwrite.
- **Scope creep detected mid-pulse**: One clear R9 push-back, then pause affected work and re-decompose if needed.
- **Human wants to change direction mid-Weave**: Log to humanpending.md with full Weave Session context. Preserve reversibility (git worktrees/branches help here).

---

## Success Criteria (for this Protocol)

A Weave is successful when:
- All strands complete their assigned scopes without scope violations.
- Knowledge from early strands measurably reduces work in later strands (no rediscovery).
- The final Weave Session + Insight Capsules form a complete, auditable record.
- The overall outcome satisfies the original Direction with evidence tags.
- Human or META-0 judgment was applied exactly where blast radius or irreversibility required it.

---

**This is a living protocol.** It is scaffolding. META-0 judgment always takes precedence. Improve it through use and named overrides.

---

*Initial draft created under META v2.0 Principal Architect mode with Zero-Pause execution. Open for refinement.*