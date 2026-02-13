#!/bin/bash
# Dangerous command blocker hook
# Triggers: PreToolUse event for Bash tool
#
# Usage: Blocks dangerous/destructive bash commands before execution
# Input: JSON via stdin containing tool_input.command
# Output: Error message to stderr if blocked
# Exit: 0 (allow), 2 (block)

# Read JSON input from stdin
INPUT=$(cat)

# Extract the command using jq
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Skip if no command found
if [ -z "$CMD" ]; then
  exit 0
fi

# List of dangerous patterns to block
DANGEROUS_PATTERNS=(
  "rm -rf /"           # Delete root
  "rm -rf /*"          # Delete all root contents
  "dd if="             # Disk destroyer
  "mkfs"               # Format filesystem
  ":(){ :|:& };:"      # Fork bomb
  "FLUSHALL"           # Redis flush all
  "FLUSHDB"            # Redis flush database
  "> /dev/sda"         # Overwrite disk
  "cat /dev/zero >"    # Fill with zeros
)

# Check each pattern
for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if [[ "$CMD" =~ $pattern ]]; then
    echo "❌ Blocked dangerous command: $CMD" >&2
    echo "   Pattern matched: $pattern" >&2
    exit 2
  fi
done

# Allow the command
exit 0
