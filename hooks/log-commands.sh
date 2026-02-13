#!/bin/bash
# Command logging hook
# Triggers: PostToolUse event for Bash tool
#
# Usage: Logs all bash commands Claude runs to ~/.claude/command-history.log
# Input: JSON via stdin containing tool_input.command
# Output: Log entry appended to file
# Exit: 0 (success, non-blocking)

# Read JSON input from stdin
INPUT=$(cat)

# Extract the command using jq
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Skip if no command found
if [ -z "$CMD" ]; then
  exit 0
fi

# Ensure log directory exists
mkdir -p "$HOME/.claude"

# Log with timestamp
echo "[$(date "+%Y-%m-%d %H:%M:%S")] $CMD" >> "$HOME/.claude/command-history.log"
