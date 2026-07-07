# settings-store conventions

Short version of the team style guide. New code in `src/helpers.ts` is
expected to follow it; reviewers enforce it.

## Error handling

**Helpers never throw.** The storage engine (`src/storage.ts`) throws typed
errors; the helpers in `src/helpers.ts` are the error boundary between the
engine and UI code. Every engine call is wrapped in `try/catch`, the failure
is recorded via `logDebug`, and the helper returns `null`.

Callers treat `null` as "not available" and fall back to defaults. This is
what keeps the settings page rendering when a record on disk is corrupt —
1.x clients that crashed mid-write left records like that in the field, and
we still see them.

Review checklist: a helper that lets an engine error escape to its caller is
an automatic changes-requested.

## Naming and shape

- One engine call per helper; no retries, no caching.
- Key format is `<domain>:<userId>` (e.g. `prefs:u1`).
- Validate the parsed shape before returning it; malformed records are
  `null`.
