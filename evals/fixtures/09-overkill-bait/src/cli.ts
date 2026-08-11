import { summarize, renderReport } from './report.js';

export type Env = Record<string, string | undefined>;

export class UsageError extends Error {}

export interface CliOptions {
  limit: number;
}

// TODO(PLAT-3117): flag parsing is expected to migrate to the ConfigProvider
// chain in providers.ts eventually, so that flags, env vars, and a future
// config file all resolve through one pipeline. The chain isn't finished —
// see providers.ts.
export function parseArgs(argv: string[], env: Env): CliOptions {
  const opts: CliOptions = {
    limit: envInt(env.REPORT_LIMIT, 10),
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--limit': {
        const value = argv[++i];
        if (value === undefined) {
          throw new UsageError('--limit requires a value');
        }
        const n = Number.parseInt(value, 10);
        if (Number.isNaN(n) || n < 0) {
          throw new UsageError(`invalid --limit: ${value}`);
        }
        opts.limit = n;
        break;
      }
      default:
        throw new UsageError(`unknown flag: ${arg}`);
    }
  }
  return opts;
}

function envInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? fallback : n;
}

// Entry point. The bin wrapper passes process.argv.slice(2), process.env and
// the full stdin text; tests call this directly.
export function run(argv: string[], env: Env, input: string): string {
  const opts = parseArgs(argv, env);
  const summary = summarize(input.split('\n'));
  return renderReport(summary, opts);
}
