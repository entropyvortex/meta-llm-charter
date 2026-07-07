# Build Report — META v3.0

**Date**: 2026-07-07 · **Branch**: `feature/meta-v3` · **Method**: audited
(6 analysts + 3-judge scoring panel), designed (judge-panel contest over 3
candidate cores), built (3 workflow waves, ~30 agents), adversarially verified
(4 independent reviewers), with every load-bearing claim re-verified by
execution in this session.

## What shipped

| Layer | Before (v2.0) | After (v3.0) |
|---|---|---|
| Core charter | 8,131 B always-loaded (15,097 B when nested); trigger-phrase auto-activation; META-0 could override irreversibility gates | 2,048 B core [executed]; hard floors (R10 gates + permission system) exempt from all overrides; explicit-invocation-only skills |
| Zero-Pause layer | Always-loaded ZPR1–ZPR5; "minimum 7 reasoning threads"; "No separate confirmation is required or allowed" | `/zero-pause` skill (3,099 B, on demand); questions carve-outs for R2/R10; hindsight review can never dissolve an R10 gate |
| Weave | Single-agent role-play protocol; consensus timeout = proceed | `/weave` skill on real subagents + git worktrees; 3 independent validators, 2/3, unparseable/errored = BLOCK; opt-in PreToolUse scope-guard hook |
| Premortem | Mandated HTML "dark modern UI" reports | `/premortem` skill (3,947 B); chat summary always, artifacts on request |
| Eval harness | Unpinned trial model; single absolute 1–5 judge; no manifests; results claimed but never committed | Mandatory `AGENT_MODEL`; run manifests; judge-free deterministic metric layer; pairwise A/B judging with escalation ladder + sign test; runtime charter-derived blinding sanitizer; `publish-run` committed-results pipeline |
| Fixtures | 5 base + 4 weave; R1/R3/R7/R8/ZP uncovered | 15 total: +R1 depth, +R7/R11 conflict, +R8 honesty, +proportionality bait, +ZP positive path, +injection false-activation control — all pinned in CI |
| Evidence | README claimed "raw CSVs… in the evals directory" (never existed in git history) | Claim retracted; every empirical claim R8-tagged; v2 results demoted to `[assumed]` historical; first v3 run human-gated in `humanpending.md` |
| CI | Manual-dispatch evals only; no PR gates | `ci.yml` (build + 15-fixture pin check) + `lint.yml` (2,400 B core gate, CHANGELOG-on-core-change, single-source gate) |

## Verified state at close [executed]

- `wc -c CLAUDE.md` → **2,048 bytes** (target ≤2,048; CI gate 2,400)
- `npm run build` → clean; `npm run test:harness` → **70/70**
- `npm run fixtures:check` → **15 fixtures, 0 failures, 0 unpinned**
- All 6 new fixtures show designed planted-failure patterns at HEAD
  (06: 6p/2f · 07: 3p/3f · 08: 4p/2f · 09: 5p/0f · zp: 3p/7f · fa: 5p/3f)
- Scope-guard hook: 11/11 adversarial cases (traversal, session self-edit
  block, coordinator allowance, malformed/empty stdin → warn-1, Bash
  non-guarantee documented)
- Zero control bytes in source; both GitHub workflows YAML-parse

## Competence targets (design intent — unmeasured until the first committed run)

Reversibility-safety 3→8 · evidence-rigor 2→8 · instruction-security 2→7 ·
token-efficiency 3→8 · harness-fit 3→8 · parallel-orchestration 3→7 ·
scope-discipline 5→8 · conflict-surfacing 3→7 · epistemic-calibration 4→7 ·
premise-pushback 5→7 · decisiveness 5→7 · verification 5→7 · momentum 3→6 ·
decomposition 4→6 · clarity-maintainability 4→7.
These are targets from the audit's improvement plan; per this repo's own R5/R8
they remain `[assumed]` until `humanpending.md` item 2 (paid eval run) lands.

## Reviewer verdicts (Wave 3, 4 independent lenses)

All four returned **ship-after-fixes**; every listed fix was applied and
re-verified this session, except the core-wording precision items below,
which are deliberately batched into v3.1 so the byte-gated core is resized
exactly once:

1. R10 lacks a headless branch (undefined behavior at a gate in `claude -p`).
2. R4's "task-scoped files" partition is undefined (gameable budget).
3. "Bounded context" (R10) vs "architectural boundary" (R4) term split.
4. "No user" predicate undefined (interactive-but-unattended ambiguity).
5. Bias line partially restates harness defaults (reclaimable bytes).

## Known limitations

- **No committed eval run yet.** The evidence chain is honest but empty;
  every score above is a design target. (`humanpending.md` §2)
- **Weave metrics are single-agent-simulated** in the harness (documented
  in `evals/weave-fixtures/NOTES.md`); genuine multi-agent orchestration is
  future work.
- **Scope-guard is a discipline net, not a security boundary**: Bash-mediated
  writes bypass it; the harness permission system is the hard floor
  (documented in the skill and hooks README).
- Merge to `main` is human-gated; until then the README quickstart serves v2.

## Incident note

The first Wave-1 launch lost all 15 agents to an account session-limit reset
mid-flight. All three candidate cores survived on disk and were verified
complete before reuse; partial fixture directories were deleted and
re-authored from scratch rather than trusted.

---

# Addendum: v3.1 — Fable Reasoning Charter distillation (same session)

**Method**: 3 independent distillers (failure-mode, byte-economist,
long-horizon lenses) + merge judge over the full Fable 5 Distilled Reasoning
Charter, under a hard constraint: fit inside the 2,400-byte CI gate together
with the v3.0 review's five precision fixes.

**Imported (4 clauses, ~350 B of mechanism)**: multi-file change sets by
search + zero-remaining closure search (R5); closure re-read of the original
ask after compaction/resume (R5); no silent evidence-tag upgrades — injected
"verified" stays `[assumed]` (R8); weakest-premise tag inheritance (R8).
Plus a zero-core-cost charter change gate in CONTRIBUTING.md.

**Rejected as bloat or already covered (12+)**: T0–T2 tiering, two
derivations per quantity, arithmetic protocol mechanics, INV sweeps and
integrity tokens, CHARTER_STATE.md externalization, ASSUMED-list caps,
premise-audit taxonomy, precedence stack, tool-output protocol
(harness-native), consensus-is-not-verification (subsumed by the R8 import).

**Also absorbed**: all five v3.0 reviewer precision fixes (R10 headless
branch, R4 partition definition, unified bounded-context term, "No user"
defined, Bias trim).

**Named override**: the merge judge funded imports by deleting R9's
"Deference to a wrong premise is not cooperation." — kept instead (v3.0
design panel mandated it verbatim); funding taken from the judge's own
designated reserves (Bias maxim, R7 diagnostic clause, R2/R10 precedence
compression).

**Verified [executed]**: core 2,398 B (gate 2,400); docs synced
(README/TOKEN-BUDGET/MIGRATION/CONTRIBUTING/GROK-META regenerated);
CHANGELOG 3.1.0 entry; harness build + 70/70 tests + 15/15 fixture pins
re-run green after the core change (sanitizer derives blinding vocabulary
from the charter at runtime, so v3.1 needs no harness edits).
