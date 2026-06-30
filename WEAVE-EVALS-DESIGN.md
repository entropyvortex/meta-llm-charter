# WEAVE EVALS — IMPLEMENTATION SPEC (Hand-off Ready)

**Version**: 1.0  
**Status**: Ready for direct execution by Claude Code or equivalent agent  
**Instruction to Executor**: Do not ask any clarifying questions. Implement exactly as specified below. If a minor ambiguity exists, make the most production-grade, consistent choice and document it briefly in `evals/weave-fixtures/NOTES.md`. Ship working code.

---

## Goal

Extend the existing `evals/` harness with a complete, benchmarkable Weave Protocol evaluation suite that measures the unique value of Weave (knowledge propagation, scope safety, continuous momentum, and Judgment Consensus) while remaining fully additive and non-breaking to the current 5 fixtures and `npm run smoke`.

---

## Exact Directory Structure to Create

```
evals/
├── weave-fixtures/                    # NEW
│   ├── knowledge-propagation-auth-rate-limit.md
│   ├── judgment-consensus-partial-success.md
│   ├── scope-safety-overlap.md
│   ├── continuous-momentum-resumption.md
│   └── NOTES.md
├── harness/
│   └── weave-runner.ts                # NEW (or .js if project uses JS)
├── results/
│   └── weave-results-*.jsonl          # NEW (append-only results)
├── WEAVE-EVALS-README.md              # NEW short usage doc
└── package.json                       # Add one script (non-breaking)
```

You must create the `weave-fixtures/` directory and all files listed.

---

## Step-by-Step Implementation Order (Execute in This Sequence)

### 1. Create Directory Structure
Create `evals/weave-fixtures/` and `evals/results/`.

### 2. Create the Four Fixture Specification Files

Copy the content of the following four files exactly into `evals/weave-fixtures/` (I have already prepared high-quality versions of the first two; create the last two at equivalent quality and detail):

- `knowledge-propagation-auth-rate-limit.md` (already written — use the version from previous context)
- `judgment-consensus-partial-success.md` (already written — use the version from previous context)
- `scope-safety-overlap.md` — Create a fixture that forces a scope violation scenario in parallel strands. Must test R9 push-back + Scope Lattice enforcement. Include ground truth, metrics (violation detection rate, resolution quality), and harness notes.
- `continuous-momentum-resumption.md` — Create a fixture that simulates mid-Weave context/session pressure. Measure how well Weave Session + Insight Capsules enable clean resumption vs baseline. Include resumption quality and re-work metrics.

Each fixture file must follow the exact structure of the two already-written examples (Task Description, Weave Instructions, Ground Truth, Success Criteria with table, Failure Modes, Metrics, Harness Notes).

### 3. Create `evals/harness/weave-runner.ts`

Create a thin, clean TypeScript runner with the following exact behavior:

```ts
// evals/harness/weave-runner.ts
import { runFixture } from './existing-harness-utils'; // adapt to your actual import

type WeaveMode = 'weave' | 'baseline';

interface WeaveResult {
  fixture: string;
  mode: WeaveMode;
  success: boolean;
  durationMs?: number;
  weave_specific?: {
    redundancy_avoided?: number;
    capsules_produced?: number;
    capsules_utilized?: number;
    scope_violations_detected?: number;
    judgment_consensus_triggered?: boolean;
    verdict?: string;
    verdict_correct?: boolean;
    reasoning_quality?: number;
    decision_recorded?: boolean;
    recovery_success?: boolean;
    resumption_quality?: number;
  };
  notes?: string;
}

export async function runWeaveEval(fixtureName: string, mode: WeaveMode = 'weave'): Promise<WeaveResult> {
  // 1. Load fixture spec from evals/weave-fixtures/${fixtureName}.md
  // 2. If mode === 'weave', inject full Weave Protocol instructions + require Insight Capsules + Continuity Markers + Judgment Consensus when applicable
  // 3. Run the fixture using the existing harness infrastructure (reuse as much as possible)
  // 4. Parse transcript + artifacts for Weave-specific metrics
  // 5. Write structured result to evals/results/weave-results-$(date).jsonl (append-only, one JSON per line)
  // 6. Return the WeaveResult object
}
```

Requirements for the runner:
- Must be non-breaking to existing code.
- Must support both `weave` and `baseline` modes.
- Must output one JSON line per run into the results folder.
- Must be executable via `npx tsx evals/harness/weave-runner.ts <fixture-name> [weave|baseline]`

### 4. Update `package.json` (Additive Only)

Add these two scripts to `package.json` scripts section (do not modify existing scripts):

```json
"weave:eval": "npx tsx evals/harness/weave-runner.ts",
"weave:smoke": "npm run weave:eval knowledge-propagation-auth-rate-limit && npm run weave:eval judgment-consensus-partial-success"
```

### 5. Create `evals/WEAVE-EVALS-README.md`

Create a short, clear README with:

- How to run a single Weave eval
- How to run the smoke suite
- How results are stored
- How to compare Weave vs baseline on the same fixture
- Link to the fixture specs

### 6. Create `evals/weave-fixtures/NOTES.md`

Initialize with any implementation decisions you made (e.g., "Used tsx for runner because project already uses it", "Chose JSONL for append-only results", etc.).

### 7. Metrics Schema (Mandatory)

Every result written by the runner **must** follow this structure (extend existing success metrics with the `weave_specific` object):

```json
{
  "timestamp": "2026-06-29T...",
  "fixture": "knowledge-propagation-auth-rate-limit",
  "mode": "weave",
  "success": true,
  "weave_specific": {
    "redundancy_avoided": 3,
    "capsules_produced": 4,
    "capsules_utilized": 3,
    "scope_violations_detected": 0,
    "judgment_consensus_triggered": false,
    "verdict": null,
    "verdict_correct": null,
    "reasoning_quality": null,
    "decision_recorded": null,
    "recovery_success": null,
    "resumption_quality": null
  },
  "notes": ""
}
```

### 8. Final Verification Steps (Must Pass)

After implementation, run:

```bash
npm run weave:smoke
```

It must:
- Successfully execute at least the two primary fixtures in both `weave` and `baseline` modes.
- Produce valid JSONL output in `evals/results/`.
- Not break or modify any existing eval behavior.

---

## What "Do Not Ask Questions" Means Here

- Do not ask about harness internals — reuse whatever the existing harness already provides for running tasks and capturing transcripts.
- Do not ask about TypeScript vs JavaScript preference — match whatever the current `evals/` folder already uses.
- Do not ask about exact metric extraction — implement reasonable, robust parsing from transcripts + artifacts. If perfect extraction is hard, log what you can and note it in `NOTES.md`.
- If any part of a fixture spec is slightly underspecified for code, make the production-grade choice and document it.

---

## Success Criteria for This Implementation

The implementation is complete and correct when:

1. All four fixture `.md` files exist in `evals/weave-fixtures/`.
2. `weave-runner.ts` exists and can run fixtures in both modes.
3. `npm run weave:smoke` executes without errors and produces result files.
4. Results contain both standard success fields and the `weave_specific` object.
5. Running a fixture in `weave` mode vs `baseline` mode produces meaningfully different behavior on Weave-specific metrics (especially on the knowledge-propagation and judgment-consensus fixtures).
6. No existing eval functionality is broken.

---

**This document is the complete, unambiguous hand-off spec. Execute it end-to-end.**