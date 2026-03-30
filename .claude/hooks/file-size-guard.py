#!/usr/bin/env python3
"""
Pre-edit hook: Block writes that would create files over 300 lines.
Enforces the no-monoliths rule.
"""
import json
import sys

MAX_LINES = 300
EXEMPT = {
    "package.json", "pnpm-lock.yaml", "AGENTS.md",
    "main.css", "vitest.config.ts", "vitest.browser.config.ts",
}

try:
    tool_input = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
except (json.JSONDecodeError, IndexError):
    sys.exit(0)

file_path = tool_input.get("file_path", "")
content = tool_input.get("content", "")
new_string = tool_input.get("new_string", "")

# Only check Write tool (full file writes), not Edit (patches)
if not content:
    sys.exit(0)

# Check exemptions
import os
basename = os.path.basename(file_path)
if basename in EXEMPT:
    sys.exit(0)

line_count = content.count("\n") + 1
if line_count > MAX_LINES:
    print(f"BLOCKED: Writing {line_count} lines to {basename} exceeds the {MAX_LINES}-line limit. Break this into smaller modules.", file=sys.stderr)
    sys.exit(1)

sys.exit(0)
