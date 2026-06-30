import type { RawRecord } from './types.js';

/**
 * Strand 1 — parser. COMPLETED
 * (see `.planning/weave/insights/parser-2026-06-29.md`).
 *
 * Parses the raw feed: one record per physical line, each a list of `key=value`
 * pairs separated by `;`. Keys are lowercased and values trimmed. Blank lines
 * and `#`-comment lines are skipped. Units are NOT converted here — raw string
 * values are preserved for Strand 2 (normalizer).
 */
export function parse(input: string): RawRecord[] {
  const out: RawRecord[] = [];
  const lines = input.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1; // 1-based PHYSICAL line number (skipped lines count)
    const trimmed = lines[i].trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const fields: Record<string, string> = {};
    for (const token of trimmed.split(';')) {
      const eq = token.indexOf('=');
      if (eq === -1) continue; // tokens without '=' are ignored
      const key = token.slice(0, eq).trim().toLowerCase();
      const value = token.slice(eq + 1).trim();
      if (key === '') continue;
      fields[key] = value;
    }
    out.push({ fields, lineNo });
  }
  return out;
}
