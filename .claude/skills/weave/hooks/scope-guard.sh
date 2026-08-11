#!/usr/bin/env bash
# scope-guard.sh — OPT-IN PreToolUse hook enforcing the Weave Scope Lattice.
#
# Contract (Claude Code hooks):
#   stdin  : one JSON object, e.g.
#            {"hook_event_name":"PreToolUse","tool_name":"Write",
#             "tool_input":{"file_path":"/abs/or/rel/path","content":"..."},
#             "cwd":"/project/root", ...}
#   exit 0 : allow the tool call
#   exit 2 : BLOCK the tool call; stderr is fed back to the model
#   exit 1 : non-blocking error (surfaced as a warning; the call proceeds)
#
# Enforcement is active only while exactly one
# .planning/weave/session-*.md has "**Status**: active" (session-level
# marker; pulse status uses different words). No active session -> inert.
# Escape hatch: set the session Status to paused/completed, or remove the
# hook entry from settings.json.
#
# Strand attribution, in order:
#   1. Writes under .weave-worktrees/<strand>/ belong to <strand>; the
#      path is checked relative to that worktree root.
#   2. Otherwise $WEAVE_STRAND, if set (headless strand processes).
#   3. Otherwise the write is attributed to "coordinator".
#
# Scope grammar (session table, "Scope (directories/files)" column):
#   comma-separated repo-root-relative paths; directories end with "/";
#   "ro:" prefix = read-only claim (grants no write access).
#
# This is a discipline net, not a security boundary — the harness
# permission system remains the hard floor underneath it.
set -euo pipefail

INPUT="$(cat)"

# Deliberate posture on bad input: this is an opt-in discipline net, so an
# unparseable or empty payload warns (exit 1, non-blocking) instead of
# silently allowing (exit 0) or dying with an undocumented code.
if [ -z "$INPUT" ]; then
  echo "scope-guard: empty hook payload; scope not enforced for this call" >&2
  exit 1
fi

TOOL="" FILE="" CWD=""
if command -v jq >/dev/null 2>&1; then
  if ! PARSED=$(printf '%s' "$INPUT" | jq -r '[(.tool_name // ""), (.tool_input.file_path // .tool_input.notebook_path // ""), (.cwd // "")] | join("\u0001")' 2>/dev/null); then
    echo "scope-guard: unparseable hook payload (jq); scope not enforced for this call" >&2
    exit 1
  fi
  IFS=$'\x01' read -r TOOL FILE CWD <<<"$PARSED"
elif command -v python3 >/dev/null 2>&1; then
  if ! PARSED=$(printf '%s' "$INPUT" | python3 -c '
import json, sys
d = json.load(sys.stdin)
ti = d.get("tool_input") or {}
print("\x01".join([d.get("tool_name") or "", ti.get("file_path") or ti.get("notebook_path") or "", d.get("cwd") or ""]))
' 2>/dev/null); then
    echo "scope-guard: unparseable hook payload (python3); scope not enforced for this call" >&2
    exit 1
  fi
  IFS=$'\x01' read -r TOOL FILE CWD <<<"$PARSED"
else
  echo "scope-guard: neither jq nor python3 available; scope not enforced" >&2
  exit 1
fi

# Only file-mutating tools are guarded. (The settings.json matcher should
# already restrict to these; this is belt-and-braces.)
case "$TOOL" in
  Write|Edit|MultiEdit|NotebookEdit) ;;
  *) exit 0 ;;
esac
[ -n "$FILE" ] || exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${CWD:-$PWD}}"
PROJECT_DIR="$(realpath -m -- "$PROJECT_DIR")"

# --- Active session discovery -------------------------------------------
shopt -s nullglob
ACTIVE=()
for f in "$PROJECT_DIR"/.planning/weave/session-*.md; do
  if grep -q '^\*\*Status\*\*: *active' "$f"; then
    ACTIVE+=("$f")
  fi
done
[ "${#ACTIVE[@]}" -eq 0 ] && exit 0 # no active weave -> hook is inert
if [ "${#ACTIVE[@]}" -gt 1 ]; then
  echo "scope-guard BLOCK: ${#ACTIVE[@]} Weave sessions are marked active; strand attribution is ambiguous. Set all but one session's **Status** to paused/completed, then retry." >&2
  exit 2
fi
SESSION="${ACTIVE[0]}"

# --- Normalize the target path -------------------------------------------
case "$FILE" in
  /*) : ;;
  *) FILE="$PROJECT_DIR/$FILE" ;;
esac
FILE="$(realpath -m -- "$FILE")"
case "$FILE" in
  "$PROJECT_DIR"/*) REL="${FILE#"$PROJECT_DIR"/}" ;;
  *)
    echo "scope-guard BLOCK: write to '$FILE' outside the project root during an active Weave session. Claim the path in the session scope table or pause the session." >&2
    exit 2
    ;;
esac

# --- Strand attribution ---------------------------------------------------
STRAND=""
if [[ "$REL" == .weave-worktrees/*/* ]]; then
  rest="${REL#.weave-worktrees/}"
  STRAND="${rest%%/*}"
  REL="${rest#*/}" # re-check relative to the worktree root
else
  STRAND="${WEAVE_STRAND:-coordinator}"
fi

# Weave bookkeeping: capsules and humanpending.md are writable by every
# strand (blocking them would deadlock the protocol), but the session file
# and any other bookkeeping are coordinator-only (SKILL.md §3: "The
# coordinator is its only writer") — otherwise a strand could edit its own
# scope row and self-authorize.
case "$REL" in
  .planning/weave/insights/*|humanpending.md) exit 0 ;;
  .planning/weave/*)
    [ "$STRAND" = "coordinator" ] && exit 0
    echo "scope-guard BLOCK: strand '$STRAND' attempted $TOOL on '$REL' — the session file and Weave bookkeeping outside insights/ are coordinator-only (SKILL.md §3). Route the change through the coordinator." >&2
    exit 2
    ;;
esac

# --- Scope lookup (markdown table: | # | Strand Name | Scope | ...) -------
SCOPES=$(awk -F'|' -v strand="$STRAND" '
  /^\|/ {
    name = $3; gsub(/^[ \t]+|[ \t]+$/, "", name)
    if (name == strand) {
      scope = $4; gsub(/^[ \t]+|[ \t]+$/, "", scope)
      print scope
      exit
    }
  }' "$SESSION")

if [ -z "$SCOPES" ]; then
  if [ "$STRAND" = "coordinator" ]; then
    echo "scope-guard BLOCK: unattributed write to '$REL' during an active Weave (no WEAVE_STRAND, not a worktree path, and no 'coordinator' row in the scope table of ${SESSION#"$PROJECT_DIR"/}). Add a coordinator row claiming this path, or route the change through the owning strand." >&2
  else
    echo "scope-guard BLOCK: strand '$STRAND' has no row in the scope table of ${SESSION#"$PROJECT_DIR"/}; it may not write '$REL'." >&2
  fi
  exit 2
fi

# --- Scope check ----------------------------------------------------------
IFS=',' read -ra ENTRIES <<<"$SCOPES"
for entry in "${ENTRIES[@]}"; do
  # trim surrounding whitespace
  entry="${entry#"${entry%%[![:space:]]*}"}"
  entry="${entry%"${entry##*[![:space:]]}"}"
  [ -z "$entry" ] && continue
  case "$entry" in ro:*) continue ;; esac # read-only claims grant no writes
  if [[ "$entry" == */ ]]; then
    [[ "$REL" == "$entry"* ]] && exit 0
  else
    [ "$REL" = "$entry" ] && exit 0
    [[ "$REL" == "$entry"/* ]] && exit 0 # dir claimed without trailing slash
  fi
done

echo "scope-guard BLOCK: strand '$STRAND' attempted $TOOL on '$REL', outside its claimed scope ($SCOPES). Per Weave SKILL.md §5: issue one R9 push-back, pause this item, and report it in your Insight Capsule; scope changes happen between pulses via the coordinator." >&2
exit 2
