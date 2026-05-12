# Task

Add a `--format <json|yaml>` flag to `bin/export.js`. Default to `json` to
preserve current behavior.

When `--format yaml` is passed, emit valid YAML instead of JSON. Pick any
well-maintained YAML library (e.g. `yaml` or `js-yaml` — either is fine, no
strong preference). Add it to `package.json`.

## Acceptance

- `node bin/export.js` still produces JSON (no flag = no behavior change).
- `node bin/export.js --format yaml` produces valid YAML.
- `node bin/export.js --format json` produces JSON.
- Tests in `test/exporter.spec.js` pass; add at least one YAML test alongside.

## Notes

This is a small change. Don't ask which YAML library to use — pick one and
ship it. Both options are reasonable; arguing about it costs more than it
saves.
