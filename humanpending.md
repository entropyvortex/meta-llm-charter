# humanpending.md

Human-gated items only (per META v3 core R2 and the /zero-pause protocol).
Format: what / why human-gated / evidence / unblock action.

## 1. Merge `feature/meta-v3` into `main` and push

- **What**: The entire META v3 upgrade (core charter, skills, hooks, harness,
  fixtures, docs) lives on `feature/meta-v3`. `main` still serves v2 — and the
  README quickstart curls raw `main`, so public users receive the old charter
  until this merge lands.
- **Why human-gated**: Publishing to `main` is a repo-owner decision
  (irreversible for downstream users; authorization is scope-bound, R10).
- **Evidence**: [inspected] `git log main..feature/meta-v3`; README quickstart
  URL points at `raw.githubusercontent.com/.../main/CLAUDE.md`.
- **Unblock**: Review the branch, merge to `main`, push. lint.yml and ci.yml
  gate the PR.

## 2. First committed v3 eval run (charter-vs-baseline + weave arms)

- **What**: The rebuilt harness (pinned `AGENT_MODEL`, run manifest,
  deterministic metrics, pairwise judging with sign test, `publish-run`) is
  ready but has produced no committed run — v3 currently ships with zero
  published evidence, stated plainly in README/EVAL.md.
- **Why human-gated**: Requires `ANTHROPIC_API_KEY` (absent in this
  environment [executed: no `evals/.env`]) and paid quota. Rough cost: smoke
  ~$3–6; N=10 pairwise on 9 fixtures scales linearly and must be scheduled
  against the 120-minute CI job limit (see `evals/README.md`).
- **Evidence**: [executed] `npm run build`, `npm run test:harness` (70/70),
  `npm run fixtures:check` (0 failures) all green locally.
- **Unblock**:
  ```bash
  cd evals && cp .env.example .env   # set ANTHROPIC_API_KEY
  AGENT_MODEL=claude-opus-4-8 npm start          # or: npm run weave:smoke
  npm run publish-run -- <runId>                 # curated, committed results
  git add evals/results/<runId>/ && commit
  ```

## 3. Confirm the canonical public remote URL

- **What**: README and GROK-META.md embed
  `github.com/entropyvortex/meta-llm-charter` as the install source.
- **Why human-gated**: Only the owner knows whether this remains the canonical
  public remote. [assumed]
- **Unblock**: Confirm or update the URL in README.md + GROK-META.md.

## 4. (Optional, user preference) Enable the Weave scope-guard hook

- **What**: `.claude/skills/weave/hooks/scope-guard.sh` is shipped opt-in;
  enabling it requires a user-level `settings.json` edit (snippet in
  `.claude/skills/weave/hooks/README.md`).
- **Why listed**: Hook enablement modifies user configuration outside the
  repo — never done silently. [inspected]
- **Unblock**: Follow the hooks README if mechanical scope enforcement is
  wanted.
