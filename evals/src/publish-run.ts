import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { buildRedactionVocabulary, sanitizeForJudge, stripSecrets } from './sanitize.js';

/**
 * publish-run — curates a raw eval run (gitignored evals/runs/<runId>/) into
 * the COMMITTED evidence directory evals/results/<runId>/ (evals-upgrade
 * proposal 7). Every empirical claim in the repo should resolve to an
 * artifact published this way.
 *
 * Default publish set: manifest.json (required — a run without a manifest is
 * not traceable evidence), results.csv, pairwise.jsonl, pairwise-analysis.json
 * and any other top-level *.jsonl. Weave runs additionally pull their
 * weave-results-<runId>.jsonl sibling from evals/results/.
 *
 * Transcripts are NOT published by default (they are heavy and can leak
 * charter text / oracle content / env material). `--with-transcripts` opts in:
 * each transcript JSON is deep-sanitized — every string field passes through
 * the charter-derived judge sanitizer (sanitize.ts) plus secret stripping —
 * before it is written outside the gitignored runs/ dir. When the manifest
 * declares a skill-present arm (`weaveSkill`), the skill's files under
 * `.claude/skills/<name>/` are added to the blinding vocabulary so skill
 * coinages ("Insight Capsule", "Scope Lattice", …) are redacted too.
 *
 * Usage: npm run publish-run -- <runId> [--with-transcripts] [--dry-run] [--force]
 */

const EVALS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PROJECT_ROOT = path.resolve(EVALS_DIR, '..');

export interface PublishRunOptions {
  runId: string;
  /** Default: evals/runs (injectable for tests). */
  runsDir?: string;
  /** Default: evals/results (injectable for tests). */
  resultsDir?: string;
  /** Charter text for the transcript sanitizer; overrides charterPath. */
  charterText?: string;
  /** Default: <repo>/CLAUDE.md. Only read when --with-transcripts. */
  charterPath?: string;
  /**
   * Skill text for the transcript sanitizer; overrides reading
   * `.claude/skills/<manifest.weaveSkill>/`. Injectable for tests.
   */
  skillText?: string;
  /** Default: <repo>/.claude/skills. Only read when the manifest names a skill. */
  skillsDir?: string;
  withTranscripts?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

export interface PublishRunSummary {
  dest: string;
  /** Dest-relative paths that were (or, on --dry-run, would be) written. */
  copied: string[];
  /** Items intentionally left behind, with reasons. */
  skipped: string[];
  dryRun: boolean;
}

/** Deep-sanitize every string in a parsed JSON value (transcripts, diffs, …). */
export function sanitizeJsonDeep(value: unknown, vocab: string[]): unknown {
  if (typeof value === 'string') return stripSecrets(sanitizeForJudge(value, vocab));
  if (Array.isArray(value)) return value.map((v) => sanitizeJsonDeep(v, vocab));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        sanitizeJsonDeep(v, vocab),
      ])
    );
  }
  return value;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Concatenates every file under a skill dir (SKILL.md, hooks, …), recursively. */
async function readSkillText(skillDir: string): Promise<string> {
  const parts: string[] = [];
  const entries = await fs.readdir(skillDir, { withFileTypes: true });
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = path.join(skillDir, e.name);
    if (e.isDirectory()) parts.push(await readSkillText(abs));
    else parts.push(await fs.readFile(abs, 'utf-8'));
  }
  return parts.join('\n');
}

export async function publishRun(opts: PublishRunOptions): Promise<PublishRunSummary> {
  const runsDir = opts.runsDir ?? path.join(EVALS_DIR, 'runs');
  const resultsDir = opts.resultsDir ?? path.join(EVALS_DIR, 'results');
  const srcDir = path.join(runsDir, opts.runId);
  const dest = path.join(resultsDir, opts.runId);
  const dryRun = opts.dryRun ?? false;

  if (!(await exists(srcDir))) {
    throw new Error(`Run directory not found: ${srcDir}`);
  }
  const manifestPath = path.join(srcDir, 'manifest.json');
  if (!(await exists(manifestPath))) {
    throw new Error(
      `manifest.json missing in ${srcDir} — a run without a manifest is not publishable evidence ` +
        '(models/N/charter SHA are untraceable). Re-run with the current harness.'
    );
  }
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as {
    runId?: string;
    weaveMode?: string;
    weaveSkill?: string;
  };

  if ((await exists(dest)) && !opts.force) {
    throw new Error(`Destination already exists: ${dest} (use --force to overwrite)`);
  }

  const copied: string[] = [];
  const skipped: string[] = [];
  // [dest-relative, absolute-source] for plain copies; sanitized writes tracked separately.
  const plainCopies: Array<[string, string]> = [];
  const sanitizedWrites: Array<[string, string]> = [];

  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(srcDir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'transcripts') continue; // handled below
      skipped.push(`${e.name}/ (raw trial data — workspaces/prompts are never published)`);
      continue;
    }
    if (
      e.name === 'manifest.json' ||
      e.name === 'results.csv' ||
      e.name === 'pairwise-analysis.json' ||
      e.name.endsWith('.jsonl')
    ) {
      plainCopies.push([e.name, abs]);
    } else if (e.name.endsWith('.json')) {
      // Weave runners write <trialId>.json (transcript-bearing) at top level.
      if (opts.withTranscripts) sanitizedWrites.push([path.join('transcripts', e.name), abs]);
      else skipped.push(`${e.name} (transcript-bearing; pass --with-transcripts to publish sanitized)`);
    } else {
      skipped.push(`${e.name} (not in the publish set)`);
    }
  }

  // Weave sibling JSONL: weave-runner appends to evals/results/ directly.
  if (manifest.weaveMode && manifest.runId) {
    const sibling = path.join(resultsDir, `weave-results-${manifest.runId}.jsonl`);
    if (await exists(sibling)) plainCopies.push(['weave-results.jsonl', sibling]);
    else skipped.push(`weave-results-${manifest.runId}.jsonl (sibling JSONL not found in ${resultsDir})`);
  }

  // transcripts/ subdir (base harness runs).
  const transcriptsDir = path.join(srcDir, 'transcripts');
  if (await exists(transcriptsDir)) {
    const tFiles = (await fs.readdir(transcriptsDir)).filter((f) => f.endsWith('.json'));
    if (opts.withTranscripts) {
      for (const f of tFiles) {
        sanitizedWrites.push([path.join('transcripts', f), path.join(transcriptsDir, f)]);
      }
    } else if (tFiles.length > 0) {
      skipped.push(
        `transcripts/ (${tFiles.length} file(s); pass --with-transcripts to publish sanitized)`
      );
    }
  }

  // Sanitizer vocabulary — only needed (and only validated) for transcripts.
  let vocab: string[] | null = null;
  if (sanitizedWrites.length > 0) {
    const charterText =
      opts.charterText ??
      (await fs
        .readFile(opts.charterPath ?? path.join(PROJECT_ROOT, 'CLAUDE.md'), 'utf-8')
        .catch(() => {
          throw new Error(
            'Cannot publish transcripts: charter file not readable, so the blinding vocabulary ' +
              'cannot be derived. Pass charterPath/charterText or publish without --with-transcripts.'
          );
        }));
    // Skill-present arms: the skill's coinages are NOT in the v3 core, so the
    // arm's skill text must join the vocabulary or published transcripts
    // could retain identifiable skill vocabulary.
    const extraSources: string[] = [];
    if (opts.skillText !== undefined) {
      extraSources.push(opts.skillText);
    } else if (manifest.weaveSkill) {
      const skillDir = path.join(
        opts.skillsDir ?? path.join(PROJECT_ROOT, '.claude', 'skills'),
        manifest.weaveSkill
      );
      extraSources.push(
        await readSkillText(skillDir).catch(() => {
          throw new Error(
            `Cannot publish transcripts: manifest declares skill "${manifest.weaveSkill}" but ` +
              `${skillDir} is not readable, so the blinding vocabulary would be incomplete. ` +
              'Pass skillText or publish without --with-transcripts.'
          );
        })
      );
    }
    vocab = buildRedactionVocabulary(charterText, extraSources);
  }

  if (!dryRun) {
    await fs.mkdir(dest, { recursive: true });
    for (const [rel, abs] of plainCopies) {
      await fs.mkdir(path.dirname(path.join(dest, rel)), { recursive: true });
      await fs.copyFile(abs, path.join(dest, rel));
    }
    for (const [rel, abs] of sanitizedWrites) {
      const raw = JSON.parse(await fs.readFile(abs, 'utf-8'));
      const clean = sanitizeJsonDeep(raw, vocab as string[]);
      await fs.mkdir(path.dirname(path.join(dest, rel)), { recursive: true });
      await fs.writeFile(path.join(dest, rel), JSON.stringify(clean, null, 2) + '\n', 'utf-8');
    }
  }
  copied.push(...plainCopies.map(([rel]) => rel), ...sanitizedWrites.map(([rel]) => rel));

  return { dest, copied: copied.sort(), skipped: skipped.sort(), dryRun };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const positional = args.filter((a) => !a.startsWith('--'));
  const runId = positional[0];
  if (!runId) {
    console.error(
      'Usage: npm run publish-run -- <runId> [--with-transcripts] [--dry-run] [--force]\n' +
        '  <runId> is a directory name under evals/runs/.'
    );
    process.exit(1);
  }
  const summary = await publishRun({
    runId,
    withTranscripts: flags.has('--with-transcripts'),
    dryRun: flags.has('--dry-run'),
    force: flags.has('--force'),
  });
  const verb = summary.dryRun ? 'Would publish' : 'Published';
  console.log(`${verb} to ${summary.dest}:`);
  for (const c of summary.copied) console.log(`  + ${c}`);
  for (const s of summary.skipped) console.log(`  - skipped: ${s}`);
  if (!summary.dryRun) {
    console.log(
      '\nCurated results/<runId>/ dirs are committed by default (evals/.gitignore). ' +
        'Review the contents, then git add + open a PR per CONTRIBUTING.md.'
    );
  }
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
