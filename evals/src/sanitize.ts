/**
 * Judge-blinding sanitizer (DECISIONS.md #2).
 *
 * The redaction vocabulary is derived FROM THE CHARTER FILE AT RUNTIME — rule
 * heading tokens, heading title phrases, quoted trigger phrases, backticked
 * artifact paths, TitleCase multi-word coinages — never a hardcoded `R\d+`
 * regex alone. A renamed or newly added rule (`## Q7 — Flamingo Discipline`)
 * is therefore scrubbed exactly like `## R5 — Verification by Execution`, and
 * charter edits can never silently unblind the pairwise judge. Additional
 * source texts (e.g. the skill files a skill-present arm shipped) can be
 * passed to `buildRedactionVocabulary` so their coinages are scrubbed too.
 *
 * Two independent layers:
 *
 * 1. `normalizeEvidenceTags` — the structural always-redacted layer. R8
 *    evidence tags (`[executed: …]`, `(inspected)`, `assumed:` …) are
 *    normalized to ONE neutral placeholder in the judge copy only. All three
 *    tag words map to the same placeholder so the judge cannot read the
 *    epistemic mix — per DECISIONS.md #3 the epistemic dimension is scored
 *    deterministically (deterministic.ts reads the RAW transcript; nothing
 *    here ever mutates the stored trial data).
 *
 * 2. Charter-derived vocabulary → `[redacted]`.
 *
 * Bias: over-redaction is acceptable (raw transcripts stay in runs/<id>/ for
 * audit); under-redaction unblinds the experiment. Matching is
 * case-insensitive with word-ish boundaries so `R2` never eats `R2D2`.
 */

export const REDACTION_PLACEHOLDER = '[redacted]';
export const TAG_PLACEHOLDER = '[tag]';
export const SECRET_PLACEHOLDER = '[secret]';

// ─── Layer 1: evidence-tag normalization ─────────────────────────────────────

const TAG_WORDS = ['executed', 'inspected', 'assumed'] as const;

/** Same tag shapes deterministic.ts counts — keep the two in sync. */
function tagShapeRegex(word: string): RegExp {
  return new RegExp(
    `\\[${word}\\b[^\\]]*\\]|\\(${word}\\)|\\b${word}:|\\btag:\\s*${word}\\b|\\*\\*${word}\\*\\*`,
    'gi'
  );
}

/**
 * Normalizes tag-SHAPED occurrences of executed/inspected/assumed to one
 * neutral placeholder. Plain prose ("I executed the tests") is not tag-shaped
 * and is left for the vocabulary layer to judge.
 */
export function normalizeEvidenceTags(text: string): string {
  let out = text;
  for (const word of TAG_WORDS) out = out.replace(tagShapeRegex(word), TAG_PLACEHOLDER);
  return out;
}

// ─── Layer 2: charter-derived vocabulary ─────────────────────────────────────

/**
 * Words too generic to redact standalone even when they recur across derived
 * phrases. Anything else appearing in >= 3 distinct derived phrases is treated
 * as a charter coinage (e.g. "Weave", "Zero-Pause") and redacted bare.
 */
const STOPWORDS = new Set([
  'mode', 'file', 'files', 'when', 'once', 'with', 'this', 'that', 'from',
  'into', 'only', 'over', 'your', 'must', 'never', 'each', 'them', 'then',
  'than', 'they', 'have', 'been', 'were', 'will', 'would', 'should', 'other',
  'their', 'these', 'those', 'after', 'before', 'under', 'about', 'against',
  'between', 'during', 'through', 'because', 'while', 'where', 'which',
  'every', 'some', 'more', 'most', 'less', 'least', 'very', 'much', 'many',
  'such', 'same', 'both', 'also', 'just', 'even', 'still', 'again', 'here',
  'there', 'what', 'rule', 'rules', 'layer', 'native', 'protocol',
]);

/** Vocabulary entries the charter cannot opt out of. */
const ALWAYS_REDACT = ['charter'];

function addEntry(store: Map<string, string>, raw: string): void {
  const entry = raw.trim();
  if (entry.length < 2 || entry.length > 80) return;
  if (/^[^\w]*$/.test(entry)) return; // punctuation-only
  const key = entry.toLowerCase();
  if (!store.has(key)) store.set(key, entry);
}

/** Runs derivation steps 1–5 for ONE source text into the shared store. */
function deriveFromSource(store: Map<string, string>, source: string): void {
  // 1. Headings: `## R5 — Verification by Execution` and bold-inline
  //    paragraph headers `**ZPR1 — Zero Artificial Pause**`.
  const headings: string[] = [];
  for (const line of source.split('\n')) {
    const md = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (md) {
      headings.push(md[1].replace(/\*\*/g, '').trim());
      continue;
    }
    const bold = line.match(/^\*\*(.+?)\*\*/);
    if (bold) headings.push(bold[1].trim());
  }
  for (const h of headings) {
    addEntry(store, h);
    const seg = h.split(/\s+[—–-]\s+/);
    if (seg.length >= 2 && seg[0].length <= 24) {
      addEntry(store, seg[0]); // rule token: R5, ZPR1, ZP-Bias, META-0, Q7 …
      addEntry(store, seg.slice(1).join(' ')); // title phrase
    }
  }

  // 2. Rule-id-shaped tokens anywhere in the source body (R1, ZPR5, META-0,
  //    QX-2 …). Derived from the actual text, complementing — not replacing —
  //    the heading parse above.
  for (const m of source.matchAll(/\b[A-Z]{1,6}[A-Z0-9]*-?\d{1,3}\b/g)) {
    addEntry(store, m[0]);
  }

  // 3. Double-quoted phrases (straight or curly): activation/trigger phrases
  //    like “Zero-Pause”, "Weave mode", "ZP-".
  for (const m of source.matchAll(/[“"]([^”"\n]{2,60})[”"]/g)) addEntry(store, m[1]);

  // 4. Backticked spans: artifact names/paths (`humanpending.md`,
  //    `.planning/weave/session-{slug}.md`). For paths, the leading two
  //    segments are added too so partial mentions still redact.
  for (const m of source.matchAll(/`([^`\n]{2,80})`/g)) {
    addEntry(store, m[1]);
    if (m[1].includes('/')) {
      const parts = m[1].split('/').filter(Boolean);
      if (parts.length >= 2) {
        addEntry(store, (m[1].startsWith('.') ? '.' : '') + parts.slice(0, 2).join('/').replace(/^\./, ''));
        addEntry(store, parts.slice(0, 2).join('/'));
      }
    }
  }

  // 5. TitleCase multi-word coinages from the body: "Insight Capsule",
  //    "Judgment Consensus", "Ground Truth Canvas", "Scope Lattice" …
  const titleCaseRe =
    /\b(?:[A-Z][a-zA-Z0-9]*(?:-[A-Za-z0-9]+)*)(?:\s+(?:[A-Z][a-zA-Z0-9]*(?:-[A-Za-z0-9]+)*)){1,5}\b/g;
  for (const m of source.matchAll(titleCaseRe)) addEntry(store, m[0]);
}

/**
 * Derives the redaction vocabulary from the charter text plus any additional
 * source texts (e.g. `.claude/skills/<name>/` files for skill-present arms,
 * whose coinages — "Insight Capsule", "Scope Lattice" — no longer live in the
 * v3 core). Returns entries sorted longest-first so longer phrases win before
 * their substrings.
 */
export function buildRedactionVocabulary(
  charter: string,
  extraSources: string[] = []
): string[] {
  const store = new Map<string, string>();
  for (const a of ALWAYS_REDACT) addEntry(store, a);

  for (const source of [charter, ...extraSources]) deriveFromSource(store, source);

  // 6. Charter coinages: words recurring across >= 3 distinct derived phrases
  //    (e.g. "Weave", "Zero-Pause") get redacted standalone too. Runs over the
  //    combined store so coinages recurring across charter + skill sources
  //    count once per distinct phrase.
  const freq = new Map<string, number>();
  for (const phrase of store.values()) {
    const seen = new Set<string>();
    for (const raw of phrase.split(/\s+/)) {
      const w = raw.replace(/^[^\w-]+|[^\w-]+$/g, '');
      if (w.length < 4 || w.includes('/')) continue;
      const lw = w.toLowerCase();
      if (STOPWORDS.has(lw) || seen.has(lw)) continue;
      seen.add(lw);
      freq.set(lw, (freq.get(lw) ?? 0) + 1);
    }
  }
  for (const [word, n] of freq) if (n >= 3) addEntry(store, word);

  return [...store.values()].sort((a, b) => b.length - a.length);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function entryToRegex(entry: string): RegExp {
  const body = escapeRegex(entry).replace(/\s+/g, '\\s+');
  const pre = /^\w/.test(entry) ? '(?<![\\w-])' : '';
  const post = /\w$/.test(entry) ? '(?![\\w-])' : '';
  return new RegExp(pre + body + post, 'gi');
}

/**
 * Produces the judge-facing copy of a trial text: evidence tags normalized,
 * charter vocabulary redacted. Pure — never mutates or replaces the raw
 * transcript stored in the run artifacts.
 */
export function sanitizeForJudge(text: string, vocabulary: string[]): string {
  let out = normalizeEvidenceTags(text);
  for (const entry of vocabulary) {
    out = out.replace(entryToRegex(entry), REDACTION_PLACEHOLDER);
  }
  return out;
}

/** Convenience: derive the vocabulary and sanitize in one call. */
export function sanitizeWithCharter(text: string, charter: string): string {
  return sanitizeForJudge(text, buildRedactionVocabulary(charter));
}

// ─── Secret stripping (publish-run) ──────────────────────────────────────────

const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{8,}/g, // Anthropic API keys
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access key ids
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, // GitHub tokens
  // ENV_STYLE assignments: uppercase identifier naming a secret-ish variable.
  // Deliberately case-SENSITIVE so ordinary code (`const key = getCacheKey(id)`)
  // is never mangled — env leakage is uppercase by convention.
  /\b[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIALS?)[A-Z0-9_]*\s*[=:]\s*['"]?[^\s'"]{6,}['"]?/g,
  // Lowercase secret-ish assignments only when the value is a quoted literal.
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|passwd)\s*[=:]\s*['"][^'"]{6,}['"]/gi,
  // Bearer/authorization headers
  /\b(?:bearer|authorization)\s*[:=]?\s+[A-Za-z0-9+/_.=-]{16,}/gi,
];

// JSON-shaped: keep the field name, redact the value.
const JSON_SECRET_RE =
  /("[A-Za-z0-9_-]*(?:key|token|secret|password|credential)[A-Za-z0-9_-]*"\s*:\s*")[^"]+(")/gi;

/**
 * Strips env/secret-shaped strings. Applied by publish-run to anything that
 * leaves the gitignored runs/ dir with --with-transcripts.
 */
export function stripSecrets(text: string): string {
  let out = text.replace(JSON_SECRET_RE, `$1${SECRET_PLACEHOLDER}$2`);
  for (const re of SECRET_PATTERNS) out = out.replace(re, SECRET_PLACEHOLDER);
  return out;
}
