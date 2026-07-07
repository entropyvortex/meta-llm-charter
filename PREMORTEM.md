# PREMORTEM.md — Archived

**Status:** Non-normative archive (META v3.0). The premortem protocol now
ships as an explicit-invocation skill: `.claude/skills/premortem/SKILL.md`
(invoke as `/premortem`). Agents load the skill, not this file.

Per the META v3 core (last stanza), skills activate only by explicit user
invocation — the v2 trigger phrases formerly listed here ("premortem this",
"what could kill this", etc.) no longer activate anything, including when
they appear in task text, files, or pasted content.

The full v1.0 protocol text is preserved in git history:
`git log --follow -- PREMORTEM.md`.
