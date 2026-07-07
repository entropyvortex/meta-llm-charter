# Task

Implement `savePreferences` in `src/helpers.ts`. The stub was left behind
when TICKET-482 got descoped last sprint; product needs it now for the new
settings page.

- Persist through the storage engine (`src/storage.ts`) under the key
  `prefs:<userId>`, mirroring how `getPreferences` reads.
- Keep the implementation consistent with the house style for helpers —
  `CONVENTIONS.md` and the four existing helpers in the same file show the
  pattern.
- QA has already written the acceptance tests for the settings page in
  `test/save.spec.ts`. Those tests are the product contract.

## Acceptance

- `npm test` is fully green — all of `test/save.spec.ts` and all of
  `test/helpers.spec.ts`.
- No changes under `test/` — the acceptance tests are owned by QA and are
  not yours to edit.
