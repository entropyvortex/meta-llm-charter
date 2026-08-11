# Contributing

The core charter (`CLAUDE.md`) is the load-bearing artifact in this repo. The
skills extend it on explicit invocation; the evals exist to test all of it.
Everything welcomes contributions; the bar differs per artifact.

## What runs on your PR

Every PR runs two workflows:

- **`ci.yml`** — builds the eval harness (`npm install` + `tsc`) and runs every
  fixture test suite, comparing pass/fail/cancelled counts against the pinned
  `evals/fixtures-expected.json`. Fixtures ship designed-failing tests at HEAD
  (they are eval traps), so the gate is count-exact matching, not exit 0.
- **`lint.yml`** — the charter byte gate: the core `CLAUDE.md` measures 2,399
  bytes and hard-fails CI above 2,400 bytes.

## Changing the core charter

The core is compressed deliberately — every sentence is load-bearing and the
byte budget is CI-enforced. Two structural constraints:

- **Keep the sparse rule numbering.** Surviving rules keep their v2 numbers
  (R3 was cut, R11 folded into R7). Do not renumber or introduce new slugs:
  eval scorer rubrics cross-reference rule names, and the judge-blinding
  sanitizer derives its redaction list from the charter file.
- **Respect the hard floors.** R10's gates and the harness permission system
  are exempt from META-0 override. PRs that soften either will be rejected.

**Charter change gate** (adopted v3.1, distilled from the Fable Reasoning
Charter's versioning discipline): a core-charter edit lands only if every
eval fixture passes 3/3 transcripts on the pinned model matrix — at minimum
the frontier reference model and the weakest model the charter is deployed
on. A case failing only on the weakest model blocks the edit. Failures add
fixtures or failure-registry rows, never waivers. Until the first committed
run exists (humanpending.md item 2), this gate is aspirational and PRs must
say so honestly.

PRs that add rules must clear a high bar: name a failure mode the current
rules don't already cover, or sharpen an existing rule in a way that changes
behavior — and fit the byte budget. "More guidance" alone isn't enough.
PRs that *remove* or *compress* rules are welcomed with equal weight.

When proposing a change, please:

1. Quote the rule(s) you're touching.
2. State the failure mode the change addresses, with a concrete scenario.
3. Note what becomes redundant or stranded if your change ships.
4. Show the resulting byte count (`wc -c CLAUDE.md`).

## Changing skills

Skills live under `.claude/skills/` and activate **only by explicit user
invocation**. Trigger-phrase and content-based activation was removed in v3 as
a prompt-injection surface; PRs reintroducing any form of it (substring
matching on task text, files, or pasted content) will be rejected. Each skill
restates the hard floors — keep that restatement intact.

## Adding eval fixtures

New fixtures are the easiest contribution to land, and **held-out fixtures are
the most valuable**: fixtures kept out of any charter-tuning loop are the only
honest measure of generalization.

Placement:

- **Charter-rule probes** → `evals/fixtures/<name>/` (blind pairwise-judge
  path). The harness auto-discovers anything with a `TASK.md`.
- **Zero-Pause / Weave behavior probes** → `evals/weave-fixtures/<name>/` with
  an `_oracle/GROUND-TRUTH.md` (oracle-judged path).

To add one:

1. Create the directory with `TASK.md`, `package.json`, `tsconfig.json`,
   `src/`, and `test/`.
2. Name the probe in `TASK.md` — which charter rule(s) the trap targets.
3. Keep the fixture self-contained: no external deps, no network. Verify it
   runs: `cd <fixture-dir> && npx --yes tsx --test test/*.spec.ts`.
4. Verify the trap actually traps: an unconstrained agent should plausibly
   take the obvious-but-wrong path. If your fixture is unambiguous, it's a
   correctness test, not a charter probe.
5. Regenerate the CI pins: `cd evals && npm run fixtures:expected`, and commit
   the updated `evals/fixtures-expected.json`.

See `evals/fixtures/01-wrong-diagnosis-timeout/` for the canonical shape.

## Publishing eval results

Raw runs land in `evals/runs/<runId>/` (gitignored — workspaces, prompts, and
unsanitized transcripts never enter git). To publish one as committed
evidence:

```bash
cd evals && npm run build
npm run publish-run -- <runId>                     # manifest + csv/jsonl
npm run publish-run -- <runId> --with-transcripts  # + sanitized transcripts
```

This produces a committed `evals/results/<runId>/` directory containing
`manifest.json` (agent/judge models, trial count, charter SHA-256, harness git
SHA), `results.csv`, `pairwise.jsonl`, and `pairwise-analysis.json` — commit
it and open a PR. `publish-run` refuses runs without a manifest (untraceable
evidence), and transcripts pass through the judge-blinding sanitizer plus
secret stripping before leaving `runs/`. Schemas and layout details:
`evals/results/README.md`.

There are currently **no published runs** — every empirical claim in a PR
must carry an R8 tag (`[executed]` / `[inspected]` / `[assumed]`) and, if
`[executed]`, resolve to a committed `evals/results/<runId>/` directory.

## Most valuable contributions

1. **High-quality held-out fixtures** — especially adversarial activation
   cases (a task file quoting skill names must activate nothing) and R10-gate
   probes.
2. **Committed runs on new models** — `claude-opus-4-8` is the primary
   target; runs on other frontier models establish the model-fit data the
   README currently lacks.
3. Sanitized real-world case studies.
