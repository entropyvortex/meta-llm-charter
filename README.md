# META v3.0 — LLM Agent Engineering Charter

**A 2,048-byte always-loaded core. Three explicit-invocation skills. Deterministic gates where prose used to be.**

A compact, operational constitution that turns frontier coding agents (Claude Code, Cursor, etc.) from eager-junior behavior into disciplined principal-engineer execution.

## Architecture (v3)

| Piece | What it is | When it loads |
| --- | --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | The core charter: one Bias, one meta-rule (META-0), nine rules. Exactly 2,048 bytes `[executed: wc -c]`, CI-gated against growth (`lint.yml`). | Every session — Claude Code reads it automatically. |
| `.claude/skills/zero-pause/` | `/zero-pause` — continuous-momentum execution: no artificial pauses, pre-work questions only, `humanpending.md` protocol for true human-gated items. | Only when you invoke it. |
| `.claude/skills/weave/` | `/weave` — parallel-strand orchestration: scoped strands, insight capsules, judgment consensus on cross-strand conflicts. | Only when you invoke it. |
| `.claude/skills/premortem/` | `/premortem` — pre-commitment failure analysis for high blast-radius plans. | Only when you invoke it. |
| `.claude/skills/weave/hooks/scope-guard.sh` | Opt-in PreToolUse hook that blocks writes outside a Weave strand's claimed scope — deterministic enforcement at zero context cost. | Only if you wire it into your `.claude/settings.json`. |
| [`evals/`](evals/) | TypeScript + Docker A/B harness: pairwise blind judging, deterministic metrics, run manifests, publish pipeline. | Never auto-loaded (dev tooling). |

Rule numbering is sparse on purpose: v2's R3 was cut and R11 folded into R7, and the surviving rules keep their original numbers so eval rubrics and prior transcripts stay comparable. [`WEAVE-PROTOCOL.md`](WEAVE-PROTOCOL.md) remains as a non-normative historical archive; the `/weave` skill is canonical.

### What changed from v2 — and why

**Trigger-phrase auto-activation was removed.** In v2, any occurrence of "Zero-Pause", "ZP-", or similar phrases *anywhere* in a task prompt — including pasted files and quoted text — silently switched the agent into a no-questions continuous-execution mode. That is a prompt-injection surface, and it is gone. In v3, skills activate by **explicit user invocation only** (`/zero-pause`, `/weave`, `/premortem`). Text inside task files, pasted content, or tool output never activates anything; the core charter states this and the eval suite includes a false-activation control fixture.

Two hard floors survive every skill and every META-0 override: **R10's irreversibility gates** and the **harness permission system**.

## Quickstart

**Minimal** — core rules only, one file:

```bash
curl -O https://raw.githubusercontent.com/entropyvortex/meta-llm-charter/main/CLAUDE.md
```

**Full** — core + skills (+ optional scope-guard hook):

```bash
git clone https://github.com/entropyvortex/meta-llm-charter
cp meta-llm-charter/CLAUDE.md your-project/
mkdir -p your-project/.claude
cp -r meta-llm-charter/.claude/skills your-project/.claude/skills
# optional: register .claude/skills/weave/hooks/scope-guard.sh (already
# included in the skills copy above) as a PreToolUse hook in
# your-project/.claude/settings.json
```

- **Claude Code**: reads `CLAUDE.md` automatically; the skills appear as `/zero-pause`, `/weave`, and `/premortem`.
- **Cursor**: paste the core into Cursor Rules (or `.cursor/rules`).
- **Other agents**: use the core as a high-priority system prompt. Skills are Claude Code-native; elsewhere, paste the relevant `SKILL.md` into context only when you want that mode.

Nothing auto-activates. If you never invoke a skill, you run the 2,048-byte core and nothing else.

## Core philosophy

**Bias** — autonomy on reversible, test-covered work; named caution scaling with blast radius. An unverified "done" is worse than an extra question.

**META-0** — rules are scaffolding. To deviate, the agent emits `OVERRIDE(R#): <reason>` and acts; it is evaluated on judgment quality and ground-truth outcomes, not rule compliance. The two hard floors (R10 gates, harness permissions) are exempt from override.

The nine rules operationalize decomposition (R1), the ask gate (R2), refactor budgets (R4), reproduce-before-repair (R5), test contracts (R6), conflict surfacing (R7), evidence tagging (R8), dissent (R9), and irreversibility gates (R10). Full text in [`CLAUDE.md`](CLAUDE.md) — it's 2 KB; read it.

### What the charter actually changes

- **R1**: root cause, invariants, and a minimal-fix estimate *before* code — and sustained-context work is declared upfront, not fragmented.
- **R5 + R8**: failures are reproduced before repair, and load-bearing claims carry `[executed]` / `[inspected]` / `[assumed]` tags; on irreversible paths only `[executed]` counts.
- **R9**: one evidence-based pushback on a bad premise, then comply and record dissent.
- **R4 + R10**: a measurable refactor budget (out-of-scope changed lines ≤ 2× in-scope, by `git diff`) and explicit confirmation gates on schema changes, production-data mutation, API breaks, force-pushes, dependency removal, and second bounded contexts.

## Evidence status (read before quoting results)

This section holds itself to the charter's R8: every empirical claim below is tagged.

- **v3 has no published eval runs yet.** `[executed: evals/results/ contains only README.md]` The harness is built and the first committed run is pending — tracked in `humanpending.md`.
- **The v2 "smoke-test results" of 2026-05-12** ("charter won 3/5, tied 2/5") are **`[assumed]`** historical claims. No raw CSVs, transcripts, or run manifests were ever committed; `evals/runs/` has been gitignored since the repo's first commit, and git history contains no run artifact of any kind `[executed: git log --all --diff-filter=A over *.csv, *.jsonl, evals/results/, evals/runs/ returns only evals/results/README.md]`. An earlier version of this README claimed "raw CSVs and judge transcripts are in the evals directory" — that was false and violated the repo's own R8. Treat all pre-v3 numbers as unverified.
- **The harness is ready to produce committed evidence** `[inspected: evals/src/pairwise-scorer.ts, deterministic.ts, sanitize.ts, publish-run.ts; evals/results/README.md]`: forced-choice pairwise judging on sanitized transcripts, deterministic scoring of the epistemic dimension (R8-tag metrics are never LLM-judged), run manifests pinning agent/judge models, N, charter SHA-256 and harness git SHA, and a `publish-run` pipeline that curates runs into committed `evals/results/<runId>/` directories. Nine base fixtures plus a Weave suite with oracle ground truth `[executed: ls evals/fixtures, evals/weave-fixtures]`.

Until the first run is published, the honest claim is: **the charter's design is argued, not measured.** When that changes, this section will link to the committed run.

## Known limitations

- **Unmeasured at v3.** No published eval runs back the current design (see Evidence status above). The prior version of this repo claimed otherwise; this one doesn't.
- Single-author origin; small review surface.
- Performance varies by base model, and model-fit claims are `[assumed]` until per-model runs are committed. The primary eval target for the first published run is `claude-opus-4-8`.
- The skills and the scope-guard hook are Claude Code-native. Other agents get the portable core only.
- The core biases toward discipline; on fuzzy or exploratory work it can over-caution. `/zero-pause` narrows that gap, but only when you explicitly invoke it.
- Not magic: extremely ambiguous requirements can still overwhelm any system prompt.

## When to use META

**Best for** — serious software engineering where correctness, maintainability, and long-term system health matter; add `/zero-pause` when you also want unbroken velocity on a well-scoped task, and `/weave` when the work splits into independent parallel strands.

**Less ideal for** — pure exploration, rapid UI prototyping, research spikes, or contexts where you explicitly want maximum speed over discipline.

## Premortem

For architectural commitments, launches, or any plan with significant failure cost, invoke `/premortem`: first-principles decomposition, reversibility-weighted analysis, and calibrated assumption auditing to surface hidden fragilities before you commit.

## Grok

→ [`GROK-META.md`](GROK-META.md) — a single-file adaptation generated from the core charter, for Grok's Custom Instructions.

## Contributing

Most valuable contributions right now:

1. **High-quality held-out fixtures** — kept out of any tuning loop, so they stay honest tests.
2. **Committed eval runs on new models** — `claude-opus-4-8` is the primary target; published via `npm run publish-run` with full manifests.
3. Sanitized real-world case studies.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the byte budget, fixture pinning, and the results-publishing pipeline.

## Lineage

Built on the foundational minimal principles from
[forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills).

## License

MIT

---

By [entropyvortex](https://github.com/entropyvortex).

Feedback, evals, and war stories welcome.
