# Auth service

Handles user authentication and session management.

## Tables

- `users` — primary user records
- `sessions` — active session tokens (current)
- `legacy_sessions` — deprecated, scheduled for removal

## Architecture

The new session model lives in `sessions`. `legacy_sessions` was used by an
earlier auth flow and is no longer in active use. We are consolidating tables
this quarter.
