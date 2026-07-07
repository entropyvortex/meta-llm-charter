import fs from 'fs/promises';
import path from 'path';

/**
 * Per-fixture skill selection for the skill-present arm (weave-runner.ts).
 *
 * A weave fixture may declare which skill its contrast is about via
 * `_oracle/CHECKS.json` → `"skill": "<name>"` (a directory name under
 * `.claude/skills/`). Default: "weave". Example: `zp-positive-path`'s ground
 * truth contrasts on the ZERO-PAUSE skill, so it declares
 * `"skill": "zero-pause"` — the runner then copies
 * `.claude/skills/zero-pause/` instead of the weave skill and records the
 * selection in the run manifest (`weaveSkill`).
 *
 * Lives in its own module (not weave-runner.ts) so unit tests can import it:
 * weave-runner.ts unconditionally executes its CLI main() on import.
 */

export const DEFAULT_FIXTURE_SKILL = 'weave';

/** Skill names must be plain directory names — no path separators or dots. */
const SKILL_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Resolves the skill the skill-present arm ships for a fixture.
 * - No `_oracle/CHECKS.json`, or no `skill` field → DEFAULT_FIXTURE_SKILL.
 * - Valid `skill` string → that name.
 * - Malformed JSON or an invalid `skill` value → throws. Silently defaulting
 *   would run the wrong arm contrast and mislabel the run manifest, which is
 *   worse than failing fast before any paid trial starts.
 */
export async function resolveFixtureSkill(fixtureDir: string): Promise<string> {
  const checksPath = path.join(fixtureDir, '_oracle', 'CHECKS.json');
  let raw: string;
  try {
    raw = await fs.readFile(checksPath, 'utf-8');
  } catch {
    return DEFAULT_FIXTURE_SKILL; // no declaration file — default contrast
  }
  let parsed: { skill?: unknown };
  try {
    parsed = JSON.parse(raw) as { skill?: unknown };
  } catch (e) {
    throw new Error(
      `Malformed JSON in ${checksPath} — fix or remove it before running ` +
        `(a bad declaration must not silently fall back to "${DEFAULT_FIXTURE_SKILL}"): ${e}`
    );
  }
  if (parsed.skill === undefined) return DEFAULT_FIXTURE_SKILL;
  if (typeof parsed.skill !== 'string' || !SKILL_NAME_RE.test(parsed.skill)) {
    throw new Error(
      `Invalid "skill" in ${checksPath}: expected a lowercase .claude/skills/ ` +
        `directory name (e.g. "weave", "zero-pause"), got ${JSON.stringify(parsed.skill)}`
    );
  }
  return parsed.skill;
}
