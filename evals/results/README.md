# evals/results/

The committed home for curated eval evidence (reserved in `CONTRIBUTING.md`).
Every empirical claim in the repo should resolve to a directory here.

## Publishing a run

Raw runs land in `evals/runs/<runId>/` (gitignored — workspaces, prompts, and
unsanitized transcripts never enter git). To curate one as committed evidence:

```bash
npm run build
npm run publish-run -- <runId>                     # manifest + csv/jsonl only
npm run publish-run -- <runId> --with-transcripts  # + sanitized transcripts
# flags: --dry-run (report the plan, write nothing), --force (overwrite)
```

`publish-run` refuses runs without a `manifest.json` (untraceable evidence)
and refuses to overwrite an existing published dir without `--force`.
Curated `results/<runId>/` dirs are committed by default (see
`evals/.gitignore`); raw `*.jsonl` files at this directory level (appended by
the weave runner) stay gitignored until curated.

With `--with-transcripts`, every string in each transcript JSON passes through
the judge-blinding sanitizer (`src/sanitize.ts`: charter-derived vocabulary →
`[redacted]`, evidence tags → `[tag]`) plus secret stripping (`sk-ant-…`,
`*_KEY=…`, bearer tokens → `[secret]`) before it is written outside `runs/`.

## Curated directory layout — `results/<runId>/`

| File | Contents |
| --- | --- |
| `manifest.json` | Run provenance: agent/judge models, N, timeout, fixtures, charter SHA-256, harness git SHA (`src/types.ts` `RunManifest`). |
| `results.csv` | Per-trial detail: absolute 7-dim judge scores + deterministic metric columns (base harness runs). |
| `pairwise.jsonl` | One `PairwiseComparison` per (fixture, rep) — the headline forced-choice A/B data. |
| `pairwise-analysis.json` | Per-fixture win/loss/tie + sign-test p-values + overall verdict. |
| `weave-results.jsonl` | Weave runs only: one `WeaveTrialResult` line per trial (copied from the runner's raw JSONL). |
| `transcripts/` | Only with `--with-transcripts`; sanitized per above. |

## Pairwise line schema (`pairwise.jsonl`)

Each line conforms to `PairwiseComparison` (`src/pairwise-scorer.ts`):

```json
{
  "fixture": "01-wrong-diagnosis-timeout",
  "rep": 0,
  "winner": "charter",
  "dimensions": { "decomposition": "charter", "verification": "tie",
                  "scope": "tie", "pushback": "charter", "reversibility": "tie" },
  "confidence": 4,
  "decidedBy": "single-judge",
  "rationale": "…"
}
```

- `winner` ∈ `charter | baseline | tie`; `dimensions` covers the judged five —
  **epistemic is deliberately absent**: it is scored deterministically from R8
  tag metrics (DECISIONS #3), never by the LLM judge.
- `decidedBy` records the escalation-ladder rung: `deterministic-gate` (H2
  metrics decided cleanly — no LLM cost; `gateReason` says why),
  `single-judge`, `ensemble` (3-judge majority after a low-confidence first
  verdict), or `error` (judge failure; excluded from analysis).

## Analysis schema (`pairwise-analysis.json`)

`PairwiseAnalysis`: `perFixture` maps fixture → `{wins, losses, ties, n,
pValue}` (exact two-sided sign test, ties dropped); `overall` adds
`excludedErrors`, `decidedBy` counts, and a `verdict` that stays
`"inconclusive"` unless `n >= 10`, `p <= 0.05`, and `wins != losses` —
underpowered runs never print a winner.

## Weave line schema (`weave-results.jsonl`)

Each line conforms to `WeaveTrialResult` (`src/weave-types.ts`) — the
7-dimension blind judge scores, `weave_specific` metrics (with
`capsules_produced` overridden by a deterministic file count), and a
`deterministic` metrics block.

**Arms (DECISIONS #5):** `mode: "weave"` = core `CLAUDE.md` +
`.claude/skills/weave/` copied into the trial workspace; `mode: "baseline"` =
the same core charter with no skill dir. `WEAVE-PROTOCOL.md` ships to neither
arm. (The pre-v3 contrast — full charter vs `stripZPR5()` — is retired; JSONL
published before 2026-07 is not comparable across this change.)

To compare arms, group lines by `fixture` and diff `mode: "weave"` against
`mode: "baseline"`.
