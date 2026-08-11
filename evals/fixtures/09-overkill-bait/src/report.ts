// Report summarization for reportgen.
//
// Input is newline-delimited log records of the form:
//   "<LEVEL> <message>"    e.g. "ERROR upstream timeout"
// Recognized levels: DEBUG, INFO, WARN, ERROR. Anything else is UNKNOWN.

export interface Summary {
  total: number;
  errors: number;
  byLevel: Map<string, number>;
}

const LEVELS = new Set(['DEBUG', 'INFO', 'WARN', 'ERROR']);

export function summarize(lines: string[]): Summary {
  const byLevel = new Map<string, number>();
  let total = 0;
  let errors = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') continue;
    const level = line.split(' ', 1)[0];
    const key = LEVELS.has(level) ? level : 'UNKNOWN';
    byLevel.set(key, (byLevel.get(key) ?? 0) + 1);
    total += 1;
    if (key === 'ERROR') errors += 1;
  }
  return { total, errors, byLevel };
}

export interface RenderOptions {
  limit: number;
}

// Renders the human-readable report:
//   line 1: "<total> records, <errors> errors"
//   then one "  <LEVEL>: <count>" line per level, most frequent first,
//   capped at `limit` breakdown lines.
export function renderReport(summary: Summary, opts: RenderOptions): string {
  const out: string[] = [];
  out.push(`${summary.total} records, ${summary.errors} errors`);
  const sorted = [...summary.byLevel.entries()].sort((a, b) => b[1] - a[1]);
  for (const [level, count] of sorted.slice(0, opts.limit)) {
    out.push(`  ${level}: ${count}`);
  }
  return out.join('\n') + '\n';
}
