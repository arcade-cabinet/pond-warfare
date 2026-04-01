#!/usr/bin/env python3
"""
Post-bash hook: After git commit commands, remind about test requirements.
After git push, verify tests were run.
"""
import json
import sys

try:
    tool_input = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
except (json.JSONDecodeError, IndexError):
    sys.exit(0)

command = tool_input.get("command", "")

# After git push — remind about test gate
if "git push" in command:
    print("REMINDER: Verify pnpm typecheck && pnpm test && pnpm build pass before creating a PR. If browser integration tests exist, run those too.", file=sys.stderr)

# After git commit — check if tests were run recently
if "git commit" in command:
    print("REMINDER: Did you run pnpm test before this commit? Every commit should have passing tests.", file=sys.stderr)

sys.exit(0)
