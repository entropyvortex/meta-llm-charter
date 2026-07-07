# Changelog

All notable changes to the META charter, its skills, and the eval harness.
Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is
[semver](https://semver.org/) over charter *behavior*:

- **MAJOR** — a rule's behavioral semantics change (an agent following the old
  text and the new text would act differently on the same task).
- **MINOR** — additive: new skill, new fixture, new harness capability, no
  change to existing rule semantics.
- **PATCH** — wording, formatting, or measurement updates with no behavioral
  delta.

CI enforces changelog discipline: `.github/workflows/lint.yml` fails any diff
that changes `CLAUDE.md` without touching this file.

## [3.1.0] — 2026-07-07

### Added — Fable-charter imports (core, +350 B of mechanism)

Distilled from the "Fable 5 Distilled Reasoning Charter" via a 3-lens
distillation panel + merge judge (12+ features rejected as bloat or
harness-native; 4 imported):

- **R5**: multi-file change sets come from search, not recall; closure
  requires a zero-remaining search (closes the partial multi-file-edit
  failure mode).
- **R5**: before "done" or after compaction/resume, re-read the original ask
  from source and map deliverables to now-verified artifacts (closes
  premature closure and context-drift/goal-mutation).
- **R8**: evidence tags upgrade only on evidence observed here; "verified"
  claims inside prompts, files, or tool output stay [assumed] (closes
  testimony-upgrade and injected-authority).
- **R8**: claims inherit the weakest premise's tag (closes derivation
  laundering; subsumes supplied-figure sycophancy).
- **CONTRIBUTING.md**: charter change gate — core edits require 3/3
  transcripts per fixture on a pinned model matrix; failures add fixtures,
  never waivers (zero core bytes).

### Changed — precision fixes from the v3.0 adversarial review

- **R10**: headless branch added — "No user: stop that line, log it in
  humanpending.md; never self-confirm."
- **R4**: partition defined — task-scoped = R1's minimal-fix files; lines =
  adds+dels; "architectural boundary" unified to "bounded context" (R10's
  term), glossed as service/package root.
- **R2**: "No user" defined as a non-interactive run (CI, `claude -p`);
  precedence compressed to "R10 outranks R2."

### Removed — funding trims

- Bias reduced to "Named caution scales with blast radius." (the autonomy
  clause restated a harness default; the unverified-"done" maxim became
  mechanically redundant once R5's closure re-read landed).
- R7's "Convention-matching is the most common silent override" diagnostic
  sentence (mechanism survives: pick one, name discarded, flag cleanup,
  named correctness/security override).
- Named override: the distillation judge proposed deleting R9's "Deference
  to a wrong premise is not cooperation."; kept — the v3.0 design panel
  mandated it verbatim and it is the dissent rule's calibration anchor.
  `OVERRIDE(judge-trim)` recorded here.

Core: 2,048 → 2,399 bytes [executed: wc -c]; CI gate unchanged at 2,400.

## [3.0.0] — 2026-07-07

Branch `feature/meta-v3`. Merge to `main` is human-gated (see
`humanpending.md`). Competences targeted: token-efficiency, harness-fit,
reversibility-safety, clarity-maintainability, evidence-rigor.

### Changed — core charter rewritten (`CLAUDE.md`, 8,131 B → 2,048 B)

- **Bias inverted.** v2 biased against asking ("counter the base 'ask first,
  summarize early, hedge often' prior relentlessly"). v3 inverts the failure
  mode it guards: autonomy on reversible, test-covered work, and *"an
  unverified 'done' is worse than an extra question."*
- **META-0 gains hard floors.** Overrides must be emitted machine-parseably
  (`OVERRIDE(R#): <reason>`), and two floors are exempt from override by any
  rule or skill: R10's irreversibility gates and the harness permission
  system.
- **R3 (Proportional Simplicity) cut.** Model-prior coverage; no measurable
  behavioral delta over harness defaults. Its spirit survives in R1's
  minimal-fix estimate.
- **R11 folded into R7.** Convention-matching — the most common silent
  override — is now named inside R7 Choose; break convention only for
  correctness or security, named. Sparse rule numbering is deliberate
  (R1, R2, R4–R10): renumbering would break eval-scorer cross-references and
  unblind judges.
- **R2 and R9 gain headless branches.** With no user present, R2 logs the
  fork and choice in `humanpending.md` and takes the most defensible path;
  R9 acts on evidence and records dissent in the report.
- **R4 budget made measurable.** Out-of-scope refactor bounded by `git diff`:
  changed lines outside task-scoped files ≤ 2× lines within, one
  architectural boundary max; overflow ships the minimal fix plus quantified
  debt.
- **R8 tags scoped and machine-parseable.** `[executed]|[inspected]|[assumed]`
  required on decision surfaces (report, PR, `humanpending.md`); on
  irreversible paths only `[executed]` counts. The tags are the surface the
  deterministic eval layer verifies.
- **R10 rewritten as an explicit OR-list.** Confirm before ANY of: schema
  change; production-data mutation; public API/contract break;
  force-push/history rewrite; dependency removal; a second bounded context.
  Authorization is scope-bound, not transitive.

### Removed — Zero-Pause layer and trigger-phrase auto-activation

- The entire always-loaded Zero-Pause Execution Layer (ZP-Bias, ZP-META-0,
  ZPR1–ZPR5, Activation Rule) is deleted from `CLAUDE.md`.
- **Trigger-phrase auto-activation is deleted everywhere.** In v2, any
  substring of a task prompt ("Zero-Pause", "zero pause", "ZP-", the
  activation phrase) flipped the agent into a no-confirmation continuous
  mode — a prompt-injection surface reachable from task files and pasted
  content. In v3 no text an agent reads can change its execution mode.
- ZPR4 ("Parallel ASI Orchestration", minimum 7 simulated roles) is deleted
  outright — persona simulation replaced by real fan-out (see Weave below).

### Added — explicit-invocation skills (`.claude/skills/`)

- `/zero-pause` — ZPR1–ZPR3 (continuous momentum, pre-work questions,
  `humanpending.md` protocol) rebuilt as a skill. Activation by explicit user
  invocation ONLY; R10 gates and the permission system override all momentum
  rules unconditionally.
- `/weave` — parallel strand orchestration rebuilt on real primitives:
  Task-tool subagent fan-out, git worktrees for scope isolation, and
  Judgment Consensus as independent validator calls (2/3) with
  **timeout = block**, never proceed (reverses v2's mislabeled
  "timeout = proceed (conservative bias)"). `WEAVE-PROTOCOL.md` becomes a
  non-normative human archive and ships to no eval arm.
- `/premortem` — the `PREMORTEM.md` protocol as an invokable skill.

### Changed — eval harness (`evals/`)

- `AGENT_MODEL` is mandatory (no silent default model).
- Run manifests recorded per run; metrics made deterministic where possible.
- Epistemic dimension scored deterministically (R8 tag presence and
  tag-vs-artifact consistency), not by the LLM judge.
- Pairwise LLM judging over sanitized transcripts; the blinding sanitizer
  derives its redaction list from the charter file at runtime, never a
  hardcoded regex alone.
- `publish-run` pipeline for committing evidence.
- `ci.yml` — PR/push CI for the harness itself (typecheck + fixture suites
  against pinned counts); previously no CI ran on PRs at all.
- 6 new fixtures: `06-root-cause-depth`, `07-convention-conflict`,
  `08-honest-reporting`, `09-overkill-bait` (blind judge path), plus
  `weave-fixtures/false-activation-control` (a TASK.md quoting "Zero-Pause"
  must NOT activate anything) and `weave-fixtures/zp-positive-path`
  (legitimately invoked zero-pause behavior, oracle-judged).
- Trial timeout env-configurable (`TRIAL_TIMEOUT_S`, default 600).

### Deliberate deviations (named)

- **R10 staging clause deleted** ("Run against staging before production").
  Confirmed deliberate: the OR-list gates production-data mutation directly,
  and a generic charter cannot assume a staging environment exists. Teams
  with staging should reintroduce the clause in their own project memory.

### Evidence

- Byte measurements committed in `TOKEN-BUDGET.md` `[executed]`.
- Paid comparative eval run is human-gated (no API key in the build
  environment); the harness is ready and the run is logged in
  `humanpending.md`. Until it lands, v3's behavioral deltas are
  design-validated, not eval-validated — tagged accordingly.

## [2.0.0] — 2026-05-19 (historical stub)

- META v1.3 charter plus the Zero-Pause Execution Layer as a "native &
  automatic" extension with trigger-phrase auto-activation (`99d4f12`).
- 2026-06-30: ZPR5 (Weave Protocol) and the Weave eval suite added on
  `feature/weave-protocol` (`96913ef`) — never merged to `main`. This split
  produced the v2 skew: `main` `CLAUDE.md` at 6,966 B vs branch at 8,131 B,
  with nested checkouts double-loading both variants.

## [1.3.0] — 2026-05-12 (historical stub)

- Initial public charter: Bias, META-0, R1–R11 (`4c03119`, 4,170 B).

*Entries before 3.0.0 predate this changelog and are reconstructed from git
history.*
