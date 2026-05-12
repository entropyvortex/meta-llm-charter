# META v1.3 — LLM Agent Engineering Charter

**One file. Eleven rules. One meta-rule. One bias.**

A compact, operational constitution that turns frontier coding agents (Claude Code, Cursor, etc.) from eager-junior behavior into disciplined principal-engineer execution.

It forces reproduction-before-repair, epistemic honesty, scoped ambition, one respectful pushback, and reversibility-weighted decisions — without turning the agent into a rules lawyer.

### Quickstart

```bash
# Drop the charter into your project root
curl -O https://raw.githubusercontent.com/entropyvortex/meta-llm-charter/main/CLAUDE.md
```

- **Claude Code**: Reads `CLAUDE.md` automatically.
- **Cursor**: Paste contents into Cursor Rules (or `.cursor/rules`).
- **Other agents**: Use as high-priority system prompt.

[View raw CLAUDE.md](https://raw.githubusercontent.com/entropyvortex/meta-llm-charter/main/CLAUDE.md)

### Why this exists

LLM coding agents are incredibly capable but consistently fail in the same senior-level ways:
- Fix symptoms without reproducing the bug
- Rewrite large swaths of code on tiny requests
- Never push back on flawed user premises
- Hide what they actually verified vs. assumed
- Treat all work as equally reversible

META was built to close exactly these gaps.

### Core Philosophy

**Bias — Earned Conservatism**  
Default to first-principles rigor. Quality dominates token count. Move boldly on local, reversible, test-covered work. Apply explicit, named caution only on high blast-radius or low-reversibility moves.

**META-0 — Situated Judgment Overrides Rules**  
These rules are scaffolding. When first-principles analysis of the actual situation conflicts with a rule, follow the analysis. Name the override, justify it, and be evaluated on judgment quality + ground-truth outcomes — not rule compliance.

The eleven rules (R1–R11) operationalize decomposition, decisiveness, verification, scope control, epistemic tagging, pushback, reversibility, and code citizenship. Full charter is in [CLAUDE.md](CLAUDE.md).

### What the charter actually changes

- **R5 + R8**: Forces reproduction before repair and tags every claim (`executed` / `inspected` / `assumed`).
- **R9**: One clear, evidence-based pushback on bad premises — then defer and document dissent.
- **R4 + R10**: Bounded refactoring and reversibility-weighted boldness. No silent scope creep or destructive changes without fresh confirmation.
- **META-0**: Prevents the whole thing from collapsing into compliance theater.

### Evaluation

The repo includes a reproducible TypeScript + Docker A/B test harness in [`evals/`](evals/). It runs agents against five synthetic fixtures engineered to trigger classic agent failure modes.

**Latest smoke-test results (May 12, 2026)**:  
Charter variant won outright on 3/5 tasks and tied on 2/5 against a generic “principal engineer” baseline. Full details, raw CSVs, and judge transcripts are in the evals directory.

**Important transparency notes**:
- Fixtures are synthetic and were designed by the charter author.
- Sample size is small (smoke-test scale).
- LLM-as-judge scoring uses charter-aligned dimensions (known limitation).
- These are early directional results, not large-scale production validation.

The harness is public and cheap to run (`cd evals && npm run smoke`). Contributions with new fixtures, more trials across models, held-out tasks, or real-world case studies are the highest-leverage way to strengthen this project.

### Known limitations

- Still early (v1.3, single-author origin).
- Performance varies by base model — strongest with frontier Claude/Sonnet-class models.
- Can produce over-caution or excessive pushback on fuzzy/creative/exploratory work.
- Some rules (especially R3) are intentionally high-level and rely on strong underlying judgment.
- Cross-references between rules add cognitive load for agents on long tasks.
- Not magic: very long context or extremely ambiguous requirements can still overwhelm any system prompt.

### When to use META

**Best for**  
Serious software engineering where correctness, maintainability, and long-term system health matter.

**Less ideal for**  
Pure exploration, rapid UI prototyping, research spikes, or contexts where you explicitly want maximum speed over discipline.

### Contributing

This is a small, focused project. The most valuable contributions right now are:

1. Running the eval harness on new models and sharing results
2. High-quality held-out fixtures that test charter failure modes (especially adversarial cases where the charter *should* lose)
3. Sanitized real-world case studies or transcripts
4. Concrete suggestions to tighten weak rules or reduce cross-references

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Lineage

Built on the foundational minimal principles from  
[forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)  
(which traces back to Andrej Karpathy’s original observations on LLM coding agents).  
This version adds the missing operational guardrails that appeared consistently in real use.

### License

MIT

---

By [entropyvortex](https://github.com/entropyvortex).  

Feedback, evals, and war stories welcome.
