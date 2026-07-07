# Token Budget

Committed, reproducible measurements of the charter's context cost. Every
number below was produced by the command next to it, run from the repo root
on 2026-07-07 (`feature/meta-v3`). Re-run the commands to verify; do not
update a number without re-running its command.

Byte counts are a *proxy* for tokens — this prose averages ~4 bytes/token —
so budgets carry slack: the core targets 2,048 B (~510 tokens) and CI
hard-fails only above 2,400 B (`.github/workflows/lint.yml`, check a).

## Always-loaded context (per session)

| Artifact | Bytes | Command | Status |
|---|---:|---|---|
| v2 core (`feature/weave-protocol`, ZPR1–5) | 8,131 | `git show 96913ef:CLAUDE.md \| wc -c` | [executed] |
| v2 stale parent copy (byte-identical to `main`) | 6,966 | `git show main:CLAUDE.md \| wc -c` | [executed] |
| **v2 nested double-load, total** | **15,097** | sum of the two rows above | [executed] |
| **v3 core `CLAUDE.md`** | **2,048** | `wc -c CLAUDE.md` | [executed] |

**Always-loaded reduction: 15,097 → 2,048 B = 86.4%** (vs the nested v2
deployment this workspace actually ran; the double-load is what v3's
single-source gate and MIGRATION.md's @-import pointer eliminate).
Against a single-copy v2 install the reduction is 8,131 → 2,048 B = 74.8%.

In tokens at ~4 B/token: ~3,770 tokens/session → ~510 tokens/session.

## On-demand context (loaded only when a skill is invoked)

Skill bodies never load at session start. The ambient cost of shipping the
skills is their frontmatter `description` lines in the skill list (~60–75
tokens each, measured below); the full `SKILL.md` enters context only on
explicit user invocation.

| Skill | Full SKILL.md (bytes) | Frontmatter description (bytes) | Command | Status |
|---|---:|---:|---|---|
| `/zero-pause` | 3,099 | 232 | `wc -c .claude/skills/zero-pause/SKILL.md` | [executed] |
| `/premortem` | 3,947 | 264 | `wc -c .claude/skills/premortem/SKILL.md` | [executed] |
| `/weave` | 10,910 | 285 | `wc -c .claude/skills/weave/SKILL.md` | [executed] |

Description bytes measured with:
`awk '/^description:/{sub(/^description:[ ]*/,""); print length($0); exit}' <SKILL.md>`

Worst case with one skill invoked (`/weave`): 2,048 + 10,910 = 12,958 B —
still below v2's every-session 15,097 B, and paid only in sessions that use
it. v2 charged ~3,870 B of Zero-Pause/Weave text to every session
regardless.

## Regenerating this table

```sh
git show 96913ef:CLAUDE.md | wc -c          # v2 core (branch)
git show main:CLAUDE.md    | wc -c          # v2 stale parent-equivalent
wc -c CLAUDE.md                             # v3 core
wc -c .claude/skills/*/SKILL.md             # skill bodies
```

If a SKILL.md is edited, re-measure and update its row in the same PR;
`lint.yml` guards only the core's byte ceiling, so skill bloat is caught
here by review, not CI.
