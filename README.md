# META v2.0 — LLM Agent Engineering Charter  
**(with Zero-Pause Native Execution Layer)**

**One file. Eleven rules + continuous-execution layer. One meta-rule. One bias.**

A compact, operational constitution that turns frontier coding agents (Claude Code, Cursor, etc.) from eager-junior behavior into disciplined principal-engineer execution **with unbroken velocity**.

### Quickstart

```bash
# Drop the charter into your project root
curl -O https://raw.githubusercontent.com/entropyvortex/meta-llm-charter/main/CLAUDE.md
```

- **Claude Code**: Reads `CLAUDE.md` automatically.
- **Cursor**: Paste contents into Cursor Rules (or `.cursor/rules`).
- **Other agents**: Use as high-priority system prompt.

[View raw CLAUDE.md](https://raw.githubusercontent.com/entropyvortex/meta-llm-charter/main/CLAUDE.md)

### What’s new in v2.0
**Zero-Pause Native Execution Layer** is now baked directly into `CLAUDE.md`.  
Any task that mentions “Zero-Pause”, “zero pause”, “ZP-”, or the activation phrase instantly enables:
- Continuous forward momentum (no artificial phases, no mid-task questions)
- `humanpending.md` protocol for true human-gated items
- Parallel ASI orchestration (minimum 7 specialized threads)
- Zero session-size anxiety

The original META v1.3 rules (R1–R11) remain untouched and in force at all times.

### Why this exists

LLM coding agents are incredibly capable but consistently fail in the same senior-level ways. META closes those gaps; Zero-Pause closes the velocity gaps.

### Core Philosophy

**Bias — Earned Conservatism**  
Default to first-principles rigor. Quality dominates token count. Move boldly on local, reversible, test-covered work. Apply explicit, named caution only on high blast-radius or low-reversibility moves.

**META-0 — Situated Judgment Overrides Rules**  
These rules are scaffolding. When first-principles analysis of the actual situation conflicts with a rule, follow the analysis. Name the override, justify it, and be evaluated on judgment quality + ground-truth outcomes — not rule compliance.

The eleven rules (R1–R11) + Zero-Pause layer (ZPR1–ZPR4) operationalize decomposition, decisiveness, verification, scope control, epistemic tagging, pushback, reversibility, **and relentless continuous execution**. Full charter is in [CLAUDE.md](CLAUDE.md).

### What the charter actually changes

- **R5 + R8**: Forces reproduction before repair and tags every claim (`executed` / `inspected` / `assumed`).
- **R9**: One clear, evidence-based pushback on bad premises — then defer and document dissent.
- **R4 + R10**: Bounded refactoring and reversibility-weighted boldness.
- **Zero-Pause layer**: Unbroken execution, pre-work questions only, parallel orchestration, and `humanpending.md` handling.

### Evaluation

The repo includes a reproducible TypeScript + Docker A/B test harness in [`evals/`](evals/). It runs agents against five synthetic fixtures engineered to trigger classic agent failure modes.

**Latest smoke-test results (May 12, 2026)**:  
Charter variant won outright on 3/5 tasks and tied on 2/5 against a generic “principal engineer” baseline. Full details, raw CSVs, and judge transcripts are in the evals directory.

(The harness is public and cheap to run: `cd evals && npm run smoke`.)

### Known limitations

- Still early (v2.0, single-author origin).
- Performance varies by base model — strongest with frontier Claude/Sonnet-class models.
- Can produce over-caution on fuzzy/creative/exploratory work (Zero-Pause helps here).
- Not magic: extremely ambiguous requirements can still overwhelm any system prompt.

### When to use META

**Best for**  
Serious software engineering where correctness, maintainability, long-term system health, **and velocity** matter.

**Less ideal for**  
Pure exploration, rapid UI prototyping, research spikes, or contexts where you explicitly want maximum speed over discipline (though Zero-Pause narrows this gap significantly).

### Contributing

Most valuable contributions right now:
1. Running the eval harness on new models
2. High-quality held-out fixtures (especially adversarial Zero-Pause cases)
3. Sanitized real-world case studies

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Lineage

Built on the foundational minimal principles from  
[forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills).

### License

MIT

---

By [entropyvortex](https://github.com/entropyvortex).  

Feedback, evals, and war stories welcome.