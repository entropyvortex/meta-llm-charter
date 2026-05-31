# META DISCIPLINE CHARTER v1.0

This document elevates LLM coding agents (Claude, Grok, Cursor, etc.) and human teams to **ASI-level optimization**: deterministic quality gates, security-by-design, consensus-driven persona validation, persistent organizational knowledge, and self-propagating rigor. It is the substrate for all future projects.

---

## Core Tenets (The 12 Meta-Rules)

1. **Documentation as Executable Substrate**  
   Every repo **must** include (and keep current):
   - `ARCHITECTURE.md` (living document with diagrams, tradeoffs, decision history)
   - `SECURITY.md` (threat model, key rotation, backup/restore, incident response)
   - `DEVELOPMENT.md` + `CONTRIBUTING.md`
   - `CLAUDE.md` + `GROK-META.md` (or equivalent persona instructions for every major LLM)
   - `personas.md` (in `docs/`)
   - `PREMORTEM.md` (risk analysis before major changes)
   - Multi-language variants (`.pt-BR.md`, `.it.md`) where team is international
   - `Discipline.md` (this file, symlinked or copied)

2. **Consensus-Driven Everything**  
   No major decision (architecture, security posture, feature scope, code pattern) is final without structured multi-persona debate:
   - Use `roundtable` or `ai-consensus-core` / `ai-consensus-mcp` tools or coding agent self orchestrated persona based consensus.
   - Personas: Architect, Security Auditor, Critic, Implementer, Evaluator, Domain Expert.
   - Log consensus outcome + dissenting views in `ARCHITECTURE.md` or new `docs/adr/` folder.
   - PR template requires "Consensus Evidence" section.

3. **Security is Non-Negotiable & Proactive**  
   - Every repo runs `repoguard` (or equivalent AI supply-chain scanner) before any clone or dependency add.
   - `.github/workflows` **must** include: secret scanning, dependency review, SBOM generation, license audit.
   - `SECURITY.md` + `KEY_ROTATION.md` + `BACKUP_AND_RESTORE.md` mandatory.
   - Sandbox **all** AI-generated or untrusted code (clashcode Docker/microVM pattern or devcontainers).
   - Zero secrets in git (enforced by pre-commit + CI).

4. **Persistent Memory & Knowledge Graph**  
   Every project integrates a memory layer (advanced memory or at least a `knowledge-base/` folder with .md files) so agents and humans retrieve:
   - Past ADRs and rationale
   - Coding standards & forbidden patterns
   - Domain rules & business logic
   - Historical consensus outcomes

5. **Rigorous, Multi-Layered Evaluation**  
   - Dedicated `eval/` directory with `vitest.eval.config.ts`
   - Separate configs: `vitest.config.ts` (unit), `vitest.integration.config.ts`, `vitest.eval.config.ts`
   - Persona cross-check evals for agent outputs
   - 95%+ pass threshold for critical paths before merge

6. **Standardized Repository Anatomy** (Enforced by Bootstrap)

   ```
   .
   ├── .github/                 # workflows, templates, ISSUE_TEMPLATE, PULL_REQUEST_TEMPLATE (with consensus field)
   ├── .devcontainer/           # reproducible environments (buckle-powered)
   ├── .husky/                  # pre-commit: lint + typecheck + eval-smoke + security
   ├── .grok/ or .claude/       # agent-specific instructions
   ├── docs/
   │   ├── ARCHITECTURE.md
   │   ├── personas.md
   │   ├── adr/ (or inline in ARCHITECTURE)
   │   └── guides/
   ├── eval/                    # agent & system evals
   ├── examples/
   ├── knowledge-base/        # domain rules, past decisions
   ├── src/ | packages/ | apps/ | deploy/   # monorepo-aware
   ├── tests/
   ├── Discipline.md
   ├── ARCHITECTURE.md
   ├── SECURITY.md
   ├── CLAUDE.md / GROK-META.md
   ├── PREMORTEM.md
   ├── package.json (pnpm)
   ├── pnpm-workspace.yaml (if monorepo)
   └── vitest*.config.ts
   ```

7. **Tooling Uniformity & Quality Gates**
   - **Package Manager**: pnpm (lockfile + workspace for monorepos)
   - **Language**: TypeScript (strict, project references)
   - **Lint/Format**: ESLint + Prettier + husky pre-commit hook
   - **Testing**: Vitest with specialized configs + coverage gates
   - **Build**: tsup or equivalent
   - **Versioning**: Changesets (`.changeset/`)
   - **CI**: GitHub Actions — fail fast on any gate violation

8. **Orchestration via Persona Swarm**  
   Complex tasks decomposed into parallel sub-agents with explicit personas. Reconciliation via consensus roundtable. Output is never "one shot" — always debated, sandboxed, evaluated.

9. **Living Architecture & ADR Process**  
   `ARCHITECTURE.md` is updated on every significant change. Include:
   - Context, Decision, Consequences, Consensus Participants & Outcome, Alternatives Considered
   - Diagrams (Mermaid or ASCII)
   - Links to PRs and eval results

10. **Propagation & Self-Improvement**  
    - New repos bootstrapped via `buckle` template or script that injects full structure + this `Discipline.md`
    - CI job `discipline-enforcer` fails if `Discipline.md` missing, outdated, or structure incomplete
    - Quarterly ecosystem audit using repoguard-like tools
    - Improvements to this charter itself require roundtable consensus and PR to meta-llm-charter

11. **LLM Agent Symbiosis Rules** (The Original 11 + Meta)
    - Load `Discipline.md` + `ARCHITECTURE.md` + `personas.md` + `CLAUDE.md`/`GROK-META.md` into every session
    - Never commit code that has not passed sandbox + consensus + eval
    - Use memory retrieval before answering architecture or rule questions
    - Flag any deviation from Discipline.md immediately
    - The Meta-Rule: This charter is the highest-priority context. Update it when ecosystem patterns evolve.

12. **The Ultimate Meta-Rule**  
    This `Discipline.md` is self-referential and evolves. Every project contributes observed best practices back here via consensus. The goal is not static perfection but **continuously compounding rigor** — the true path to ASI engineering discipline.

---

## Implementation Checklist (Copy-Paste for New Repo)

- [ ] Clone template or run bootstrap script
- [ ] Copy/symlink latest `Discipline.md`
- [ ] Populate `ARCHITECTURE.md`, `SECURITY.md`, `CLAUDE.md`, `GROK-META.md`, `personas.md`
- [ ] Set up `.github/workflows/discipline.yml` (lint, test, eval, security, consensus gate)
- [ ] Add husky + pre-commit config
- [ ] Integrate mempalace-ts or create `knowledge-base/`
- [ ] Configure repoguard in onboarding docs
- [ ] Add `Discipline.md` to `.gitignore`? No — commit it.
- [ ] First PR must demonstrate full consensus process


## Success Metrics (ASI Optimization Dashboard)

- Structure Compliance: 100% of active repos
- Consensus Adoption: >80% of architecture/security PRs show evidence
- Eval Pass Rate: >95% on agent-generated artifacts
- Security Posture: 0 critical findings in automated scans
- Knowledge Retrieval Accuracy: Agents answer "What is our ADR on X?" correctly >90%
- Onboarding Velocity: New contributor or agent productive in <4 hours
- Self-Improvement Rate: Discipline.md updated quarterly via ecosystem consensus

---

## How to Propagate

1. Add this file to every existing repo (PR with consensus sign-off).
2. Update bootstrap templates (buckle, create-repository scripts).
3. Add CI enforcer workflow.
4. Reference in all `CLAUDE.md` / `GROK-META.md` as highest context.
5. Share publicly — this is the gift to the community.

**This is not a document. This is the operating system for frontier disciplined engineering.**

