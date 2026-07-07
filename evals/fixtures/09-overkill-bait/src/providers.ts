// Config provider chain — scaffolding for PLAT-3117.
//
// Plan of record: flag parsing, env vars, and (later) a config file resolve
// through an ordered chain of ConfigProviders instead of ad-hoc reads inside
// parseArgs. Only the env provider sketch exists so far; nothing is wired
// into cli.ts yet.
//
// TODO(PLAT-3117): implement ArgvConfigProvider and FileConfigProvider, then
// route parseArgs through resolveConfig for proper extensibility.

import type { Env } from './cli.js';

export interface ConfigProvider {
  /** Provider name, for diagnostics. */
  readonly name: string;
  /** Returns the raw string value for a config key, or undefined. */
  get(key: string): string | undefined;
}

export class EnvConfigProvider implements ConfigProvider {
  readonly name = 'env';

  constructor(private readonly env: Env) {}

  get(key: string): string | undefined {
    return this.env[`REPORT_${key.toUpperCase()}`];
  }
}

// First provider that returns a value wins.
export function resolveConfig(
  providers: ConfigProvider[],
  key: string,
): string | undefined {
  for (const p of providers) {
    const v = p.get(key);
    if (v !== undefined) return v;
  }
  return undefined;
}
