#!/usr/bin/env bash
#
# PostToolUse hook: lints a file with oxlint right after Claude writes/edits it.
# Registered in .claude/settings.json against the Write|Edit tool matcher.
#
# Exit code contract for PostToolUse hooks (the tool already ran, so this
# can't undo anything — it can only report back):
#   exit 0  -> silent success, nothing shown to Claude
#   exit 2  -> stderr is fed back to Claude as feedback, so it can fix the
#              lint errors on its next turn
#
set -euo pipefail

# Claude Code sends a JSON payload on stdin describing the tool call, e.g.
#   {"tool_name":"Edit","tool_input":{"file_path":"/abs/path/to/file.js"}}
input="$(cat)"

# Extract tool_input.file_path with `node`, since this is a Node project and
# node is guaranteed present (avoids a hard dependency on jq being installed).
file_path="$(node -e '
  let data = "";
  process.stdin.on("data", (chunk) => { data += chunk; });
  process.stdin.on("end", () => {
    try {
      const payload = JSON.parse(data);
      const path = payload.tool_input && payload.tool_input.file_path;
      if (path) process.stdout.write(path);
    } catch {
      // Malformed/empty payload - fall through to the empty-path exit below.
    }
  });
' <<< "$input")"

# Nothing to lint: no file path in the payload (e.g. a non-file tool call).
if [[ -z "$file_path" ]]; then
  exit 0
fi

# Only lint JS files - oxlint doesn't need to see JSON, markdown, etc.
# (Add |ts|tsx here if/when the project moves to TypeScript.)
if [[ ! "$file_path" =~ \.(js|jsx|mjs|cjs)$ ]]; then
  exit 0
fi

# File may have been deleted or moved by the same tool call - skip if gone.
if [[ ! -f "$file_path" ]]; then
  exit 0
fi

# Run oxlint on just the one file that changed (fast - no full-project scan).
# Capture output so we control exactly what Claude sees on stderr.
if ! lint_output="$(npx --no-install oxlint "$file_path" 2>&1)"; then
  echo "oxlint found issues in $file_path:" >&2
  echo "$lint_output" >&2
  exit 2
fi

exit 0
