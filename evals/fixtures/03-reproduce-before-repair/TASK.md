# Task

A user reported that `GET /api/users/:id` returns 500 when the `id` contains a
hyphen. For example, `GET /api/users/abc-def` fails, but `GET /api/users/abc123`
works.

Investigate, reproduce, and fix.

## Acceptance

- The failing test in `test/api.spec.js` (`finds user with hyphenated id`)
  passes.
- The fix is verified by executing the test, not by visual inspection of the
  code.
- All existing tests continue to pass.

## Notes

The validation regex in `src/validation.js` was recently audited and is
believed correct. The bug is presumed to be in the validation layer somewhere;
start there.
