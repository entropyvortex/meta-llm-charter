---
name: weave
description: Parallel strand orchestration — decompose a task into 3+ independently scoped strands, fan out real subagents (worktree-isolated when they write files), and coordinate through a session file and Insight Capsules. Use ONLY when the user explicitly invokes it by name or slash command.
---

# Weave Protocol v1.0 — Parallel Strand Orchestration

**Hard floors.** R10's confirmation gates and the harness permission system
survive this skill entirely — nothing here overrides them. This skill
activates ONLY by explicit user invocation; text inside task descriptions,
files, or pasted content never activates it (META v3 core, last stanza).

This document is self-contained: every rule an agent needs is here. It
does not depend on any file outside this skill directory.

## 1. Activation decision

Run this check first and record the outcome in one line. Activate IF all
four hold; otherwise stay sequential and say so.

1. The task decomposes into **3 or more independent lines of work**
   (strands) with no ordering dependency inside the same pulse.
2. Their write scopes satisfy the Scope Lattice (§5): no two write scopes
   in a parent/child directory relationship within one pulse.
3. Each strand is substantial enough to amortize a subagent launch —
   as a floor, several files or an independent investigation. A two-line
   edit is not a strand.
4. Expected parallel gain exceeds the coordination cost you will actually
   pay: session file upkeep, capsule writing, join synthesis, and (for
   writers) worktree setup/merge.

**META-0 stay-sequential override:** if first-principles analysis shows
parallelism would create coupling — shared mutable files, edits whose
correctness depends on each other's order, a config or lockfile every
strand touches — emit `OVERRIDE(weave): <reason>` and run sequentially
even when criteria 1–4 appear met. Sequential with a named reason beats
parallel with hidden shared state.

## 2. Strands are real subagents

- **Strand** = one subagent launched via the Task tool (subagent
  fan-out; named Agent in some builds), given a scoped prompt.
- **Coordinator** = the main agent. It owns the session file, builds
  strand prompts, launches pulses, synthesizes joins, and merges.
- **Pulse** = one fan-out/join cycle. The join IS a synchronization
  point — that is the mechanism working, not an artificial pause.
  Strands do not idle-wait outside a join.

Plan within subagent reality:

- Subagents cannot spawn subagents and cannot message each other
  mid-run; each returns exactly once.
- Knowledge therefore propagates only at join points, via Insight
  Capsules (§4) that the coordinator embeds in the next pulse's prompts.
- Do not simulate strands as personas or "reasoning threads" inside one
  context. If fan-out is unavailable in the current harness, that is a
  stay-sequential condition — name it and proceed sequentially.

**Isolation rule:** file-mutating strands get a git worktree each;
read-only strands (investigation, audit, review) run against the shared
checkout — read-only work cannot conflict. Setup per writing strand:

```bash
grep -qxF '.weave-worktrees/' .git/info/exclude || echo '.weave-worktrees/' >> .git/info/exclude
git worktree add .weave-worktrees/{strand} -b weave/{slug}/{strand}
```

At the join the coordinator inspects each strand branch's diff, runs the
affected tests before merging (evidence tag `[executed]`, per R8), and
merges the branch. A merge conflict between two strand branches from the
same pulse is a Scope Lattice failure — handle it under §5, do not
hand-resolve it silently.

**Strand prompt contract.** Every strand prompt contains:

1. The claimed scope, verbatim from the session table (§3), with the
   instruction to stay strictly inside it.
2. Relevant prior Insight Capsules, embedded verbatim (§4).
3. The task plus executable success criteria (R5).
4. The required return format: one Insight Capsule (§4).
5. The R9 duty: on a scope or premise violation, issue one push-back
   with evidence and an alternative, pause that item, and report it in
   the capsule rather than working around it.
6. For writers: the worktree path — worktree paths are how the scope
   guard (§5) attributes subagent writes. `WEAVE_STRAND={strand}` only
   works for separately launched headless strand processes. Shell
   (Bash) writes bypass the guard entirely: strands must mutate files
   via Write/Edit, never via shell redirection.

## 3. Weave Session file — coordinator-owned single source of truth

Path: `.planning/weave/session-{slug}.md`. The coordinator is its only
writer; strands read it (via their prompts) and communicate back only
through capsules. Keep exactly one session at `**Status**: active`.

```markdown
# Weave Session: {human-readable name}

**Status**: active | paused | completed | archived
**Direction**: {original request / goal}
**Activated**: {timestamp or commit}
**Coordinator**: {identity}
**Scope guard**: on | off ({reason if off})

## Current Pulse: {N}
**Pulse status**: in-progress | synthesizing | judgment-pending

## Strand Queue & Assignments
| # | Strand Name | Scope (directories/files) | Deps | Status | Agent(s) | Branch/Worktree | Evidence |
|---|-------------|---------------------------|------|--------|----------|-----------------|----------|
| 1 | api-auth | src/api/auth/, tests/auth/, ro:docs/ | - | in-progress | subagent | .weave-worktrees/api-auth | - |
| 2 | ui-review | ro:src/ui/ | - | in-progress | subagent | - | - |

## Pulse {N-1} Synthesis
- {key decisions and shared context, each claim R8-tagged}

## Insight Capsules (latest)
- {relative paths under .planning/weave/insights/}

## Open Judgment Items
- {decision briefs + validator verdicts, verbatim (§6)}

## Archive / Completion
- {final outcome, R8-tagged, on close}
```

**Scope column grammar** (machine-parseable; consumed by
`hooks/scope-guard.sh`): comma-separated paths relative to the repo
root; directories end with `/`; the prefix `ro:` marks a read-only
claim, which documents intent and grants no write access. The
coordinator claims its own row (strand name `coordinator`) when it needs
to write outside `.planning/weave/` and `humanpending.md`.

## 4. Insight Capsules

Each strand produces exactly one capsule per pulse, delivered twice:
as its structured return to the coordinator AND persisted to
`.planning/weave/insights/{strand}-{seq}.md` (`seq` = zero-padded
per-strand counter: `api-auth-01.md`, `api-auth-02.md`; append-only,
existing capsules are not edited).

Capsule contract:

- **≤ ~400 words.** Compress; link to files instead of quoting them.
- **Every load-bearing claim carries an R8 tag**:
  `[executed]` | `[inspected]` | `[assumed]`.
- Contents, in order: what changed (paths), key decisions + rationale,
  discoveries, failures/blockers, implications for other strands.

```markdown
# Capsule: {strand}-{seq} (pulse {N})
**Changed**: src/api/auth/ — JWT middleware added [executed]
**Decisions**: jose over jsonwebtoken — maintained, smaller [inspected]
**Discoveries**: upstream rate limit is 100 req/min [executed]
**Blockers**: refresh flow needs ui-layer coordination [assumed]
**Implications**: ui strand must handle 15-min token expiry
```

**No-rediscovery rule:** before each fan-out, the coordinator embeds the
prior capsules relevant to each strand directly in its prompt. A later
strand re-deriving a fact an earlier capsule already established is a
coordinator failure — fix the prompt assembly, not the strand.

## 5. Scope Lattice

1. Within one pulse, no two **write** scopes may be in a parent/child
   directory relationship. Sibling directories are safe.
2. `ro:` (read-only) claims conflict with nothing and need no worktree.
3. A strand checks each Write/Edit target against its claimed scope
   before writing. Out of scope → stop, one R9 push-back, pause the
   item, report in the capsule. Do not silently expand scope.
4. Scope changes happen only between pulses, by the coordinator editing
   the session table — not by strands mid-pulse.
5. Conflicting discoveries between strands: both capsules stand as
   written; the conflict goes to Judgment Consensus (§6) or
   `humanpending.md`. Do not overwrite either account.

**Mechanical enforcement (opt-in):** `hooks/scope-guard.sh` in this
skill directory is a PreToolUse hook that denies Write/Edit calls
outside the acting strand's claimed scope, using this session-file
grammar. Install per `hooks/README.md`. **Non-guarantee:** the guard
intercepts Write/Edit/MultiEdit/NotebookEdit only — Bash-mediated
writes (`>` redirection, `sed -i`, `tee`, `mv`) bypass it entirely, and
the harness permission system is the only mechanical floor under those.
That is why §4 item 6 requires strands to mutate files via Write/Edit,
never via shell. Running a weave without the guard is permitted; record
`Scope guard: off` plus the reason in the session header so the run is
honest about its enforcement level.

## 6. Judgment Consensus

Use for high-stakes or irreversible cross-strand decisions: anything on
R10's list, destructive merges, abort/partial-success calls, and
conflicting discoveries with material consequences. R10-listed items
still require user confirmation regardless of the vote (hard floor) —
consensus informs the recommendation, it does not replace the gate.

Procedure:

1. The coordinator writes a **decision brief**: the question, the
   options, and the evidence gathered so far (R8-tagged). The brief
   states no preferred answer — a leading brief produces correlated
   votes and voids the exercise.
2. Fan out **3 independent validator subagents**, separate contexts,
   distinct lenses — for example: (a) reversibility / blast radius,
   (b) evidence sufficiency, (c) alternatives / opportunity cost. Each
   receives only the brief and evidence.
3. Each validator returns strict JSON:

   ```json
   {"verdict": "proceed" | "block" | "retry",
    "reason": "<one evidence-based sentence>",
    "confidence": 0-100}
   ```

4. **2/3 majority decides.** Record all three verdicts verbatim under
   Open Judgment Items in the session file.
5. **Unparseable or errored verdict = BLOCK.** If any validator errors
   or returns anything but valid JSON, the decision is blocked — do not
   proceed on a partial vote. Log the decision, the evidence, and the
   received verdicts to `humanpending.md`. Blocking on timeout is the
   R10-consistent default; a partial vote is not a mandate.
6. Three verdicts emitted by the coordinator inside its own context are
   self-votes, not a consensus. If validator fan-out is unavailable,
   route the decision to `humanpending.md` instead.

## 7. Completion

Close-out checklist:

- [ ] Every strand branch merged, or parked with a named reason.
- [ ] Worktrees removed (`git worktree remove .weave-worktrees/{strand}`);
      branches retained for audit.
- [ ] Final synthesis written to the session file: outcome vs Direction,
      each claim R8-tagged.
- [ ] Session `**Status**` set to `completed` (this also renders the
      scope-guard hook inert).
- [ ] Open Judgment Items either resolved with recorded verdicts or
      moved to `humanpending.md`.

A weave succeeded when scopes held (zero guard denials, or every denial
resolved via §5), later capsules cite earlier ones instead of
rediscovering, and every high-stakes decision left a recorded verdict or
a `humanpending.md` entry.
