#!/bin/bash
# Smart auto-format hook with package manager detection
# Triggers: PostToolUse event for Write|Edit tools
#
# Usage: Automatically formats files after Claude edits/writes them
# Detects: pnpm > bun > yarn > npm (in order)
# Formatters: biome, prettier, eslint
# Input: JSON via stdin containing tool_input.file_path
# Output: None (formatting happens in background)
# Exit: 0 (success, non-blocking)

# Read JSON input from stdin
INPUT=$(cat)

# Extract the file path using jq
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Skip if no file path or file doesn't exist
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  exit 0
fi

# Get the directory of the file to check for package manager lockfiles
FILE_DIR=$(dirname "$FILE")
cd "$FILE_DIR" 2>/dev/null || exit 0

# Detect package manager (pnpm > bun > yarn > npm)
PKG="npm"
if [ -f "pnpm-lock.yaml" ]; then
  PKG="pnpm"
elif [ -f "bun.lockb" ]; then
  PKG="bun"
elif [ -f "yarn.lock" ]; then
  PKG="yarn"
fi

# Try 'format' script first (most projects have this in package.json)
if [ -f "package.json" ] && jq -e '.scripts.format' package.json >/dev/null 2>&1; then
  $PKG run format "$FILE" 2>/dev/null || true
  exit 0
fi

# Fall back to direct formatter commands
if command -v biome >/dev/null 2>&1; then
  $PKG biome check --write "$FILE" 2>/dev/null || true
elif command -v prettier >/dev/null 2>&1; then
  $PKG prettier --write "$FILE" 2>/dev/null || true
elif command -v eslint >/dev/null 2>&1; then
  $PKG eslint --fix "$FILE" 2>/dev/null || true
fi

exit 0
