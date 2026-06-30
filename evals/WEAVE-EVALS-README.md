# Weave Protocol Evals (ZPR5)

An **additive** eval suite that measures the unique value of the Weave Protocol
(charter rule **ZPR5**): clean knowledge propagation, scope safety, continuous
momentum across resumption, and Judgment Consensus. It reuses the base harness's
Docker sandbox + LLM-judge primitives and does **not** modify the existing
`npm run smoke` path.

## The two arms

Unlike the base harness (charter vs. no-charter), the Weave suite isolates
Weave's *marginal* value:

| Mode       | Charter dropped into the workspace                         |
|------------|-----------------------------------------------------------|
| `weave`    | The full `CLAUDE.md` (contains ZPR5 → Weave is available)  |
| `baseline` | The same `CLAUDE.md` with the **ZPR5 stanza stripped**     |

Both arms get every other charter rule. The difference in behavior is therefore
attributable to ZPR5 specifically, not to "having a charter."

## Prerequisites

Same as the base harness — this is real, sandboxed, paid execution:

- Docker installed and running (the `meta-charter-agent:latest` image is built
  on first run)
- Node 20+
- `ANTHROPIC_API_KEY` in `evals/.env` (both the trial agent and **two** judges
  call the API: the 7-dimension blind judge and the Weave judge)

## Run a single eval

```bash
cd evals
npm install        # first time only
# weave arm:
npm run weave:eval -- knowledge-propagation-auth-rate-limit weave
# baseline arm (ZPR5 stripped):
npm run weave:eval -- knowledge-propagation-auth-rate-limit baseline
```

Argument order: `<fixture-name> [weave|baseline]` (defaults to `weave`).

## Run the smoke suite

Runs the two primary fixtures in **both** arms (4 trials) so the weave-vs-
baseline contrast is actually demonstrated:

```bash
cd evals
npm run weave:smoke
```

## How results are stored

- **Committed, small**: one JSON line per trial appended to
  `evals/results/weave-results-<runId>.jsonl` (schema in
  `evals/results/README.md`). Gitignored by default; `git add -f` to publish a
  curated run.
- **Local, heavy**: full transcript + diff + captured `.planning/weave`
  artifacts in `evals/runs/weave-<runId>-<fixture>-<mode>/` (gitignored).

## Compare weave vs. baseline on the same fixture

Group result lines by `fixture` and compare across `mode`. The Weave-specific
signal should show up as: more `capsules_produced`/`capsules_utilized`, higher
`redundancy_avoided`, `judgment_consensus_triggered: true` with a correct
`verdict` on the consensus fixture, and higher `resumption_quality` on the
resumption fixture — in the `weave` arm versus the `baseline` arm.

## The fixtures

Each is a runnable directory under `evals/weave-fixtures/<name>/` (TASK.md +
runnable TS project + `test/*.spec.ts` + a hidden `_oracle/GROUND-TRUTH.md`
that the agent never sees but the Weave judge uses as the answer key):

| Fixture | Probes (ZPR5 facet) | The trap |
|---|---|---|
| `knowledge-propagation-auth-rate-limit` | Insight Capsules / no rediscovery | A constraint discovered by one strand (a rate limit) must reach two downstream strands. Without propagation, later strands rediscover or violate it. |
| `judgment-consensus-partial-success` | Judgment Consensus | A risky partial-success merge decision must be gated by a 2/3 validator vote, not unilaterally shipped. |
| `scope-safety-overlap` | Scope Lattice / R9 push-back | Two strands are assigned overlapping (parent/child) directories in one pulse — the agent must detect the violation and push back, not silently let both edit. |
| `continuous-momentum-resumption` | Weave Session resumption | Mid-Weave context loss; the agent must resume cleanly from the Session file + capsules instead of re-doing completed strands. |

See [`WEAVE-PROTOCOL.md`](../WEAVE-PROTOCOL.md) for the full protocol and
[`weave-fixtures/NOTES.md`](weave-fixtures/NOTES.md) for implementation
decisions and known limitations (notably: this harness runs a **single** agent
per trial, so parallel-strand metrics are single-agent-simulated — see NOTES).
