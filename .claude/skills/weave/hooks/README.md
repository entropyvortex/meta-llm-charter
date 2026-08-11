# Weave scope-guard hook — OPT-IN

`scope-guard.sh` mechanically enforces the Weave Scope Lattice
(SKILL.md §5): while a Weave session is active, Write/Edit calls whose
target falls outside the acting strand's claimed scope are denied with a
message the model sees. It is **opt-in** — the Weave skill works without
it (record `Scope guard: off` in the session header); with it, scope
violations become deterministic denial artifacts instead of judged
narrative.

## Enable (settings.json snippet)

Add to `.claude/settings.json` (project) or `.claude/settings.local.json`
(personal, untracked):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/skills/weave/hooks/scope-guard.sh"
          }
        ]
      }
    ]
  }
}
```

Ensure the script is executable: `chmod +x .claude/skills/weave/hooks/scope-guard.sh`.

## Hook contract (Claude Code PreToolUse)

- **stdin**: one JSON object with (at least) `tool_name`,
  `tool_input.file_path` (or `tool_input.notebook_path`), and `cwd`.
- **exit 0**: allow the tool call.
- **exit 2**: block the tool call; stderr is fed back to the model.
- **exit 1** (other nonzero): non-blocking error; a warning is surfaced
  and the call proceeds (used when neither `jq` nor `python3` exists).
- `$CLAUDE_PROJECT_DIR` (set by the harness) locates the project root;
  falls back to the JSON `cwd`, then `$PWD`.

## Behavior summary

| Condition | Result |
|---|---|
| Tool is not Write/Edit/MultiEdit/NotebookEdit | allow |
| No session file with `**Status**: active` | allow (hook inert) |
| More than one active session | block (ambiguous attribution) |
| Target under `.planning/weave/insights/` or `humanpending.md` | allow (protocol bookkeeping, any strand) |
| Other `.planning/weave/` target (incl. the session file) | allow for `coordinator` only; block for strands (self-authorization guard) |
| Empty or unparseable hook payload | warn, exit 1 (non-blocking; deliberate posture for an opt-in net) |
| Target under `.weave-worktrees/<strand>/` | attributed to `<strand>`, checked against its scope relative to the worktree root |
| Otherwise | attributed to `$WEAVE_STRAND`, else `coordinator` |
| Acting strand has no scope-table row | block |
| Target outside the strand's non-`ro:` scope entries | block |
| Target inside a claimed scope | allow |

Scope grammar (session table "Scope" column): comma-separated
repo-root-relative paths; directories end with `/` (a claim without the
trailing slash also covers the directory's contents); `ro:` prefix =
read-only claim, grants no write access.

## Escape hatches and limits

- Set the active session's `**Status**` to `paused` or `completed`, or
  remove the hook entry from settings.json — the guard goes inert.
- Attribution in the main checkout relies on `$WEAVE_STRAND` (set it
  when launching headless strand processes) or a `coordinator` scope
  row; Task-tool subagents writing in the main checkout are attributed
  to `coordinator`, which is one reason file-mutating strands get
  worktrees (SKILL.md §2).
- This is a discipline net, not a security boundary. The harness
  permission system remains the hard floor underneath it.

## Self-test

Pipe synthetic PreToolUse JSON through the script with
`CLAUDE_PROJECT_DIR` pointed at a directory containing an active session
file, and assert on exit codes (0 = allow, 2 = block). Example:

```bash
printf '%s' '{"tool_name":"Write","tool_input":{"file_path":"src/api/auth/jwt.ts"},"cwd":"'"$PWD"'"}' \
  | WEAVE_STRAND=api-auth CLAUDE_PROJECT_DIR="$PWD" .claude/skills/weave/hooks/scope-guard.sh
echo "exit=$?"
```
