#!/usr/bin/env python3
"""
Pre-edit hook: Block writes that would create files over 300 lines.
Enforces the no-monoliths rule.
"""
import json
import os
import sys

MAX_LINES = 300
EXEMPT = {
    "package.json", "pnpm-lock.yaml", "AGENTS.md",
    "main.css", "vitest.config.ts", "vitest.browser.config.ts", "CLAUDE.md",
}

try:
    tool_input = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
except (json.JSONDecodeError, IndexError):
    sys.exit(0)

file_path = tool_input.get("file_path", "")
content = tool_input.get("content", "")

# Only checks Write tool (full file content). Edit operations supply patches,
# not the final file content, so we cannot reliably check the resulting line
# count from this hook. A post-edit size check would require reading the file
# after the edit is applied, which is outside the PreToolUse hook lifecycle.
if not content:
    sys.exit(0)

# Check exemptions
basename = os.path.basename(file_path)
if basename in EXEMPT:
    sys.exit(0)

line_count = len(content.splitlines())
if line_count > MAX_LINES:
    print(f"BLOCKED: Writing {line_count} lines to {basename} exceeds the {MAX_LINES}-line limit. Break this into smaller modules.", file=sys.stderr)
    sys.exit(1)

sys.exit(0)
