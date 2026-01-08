#!/bin/bash
# setup.sh - Creates a symlink to make agent definitions available to Claude Code
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/agents"
TARGET_DIR="$HOME/.claude/agents"

# Verify source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Source directory does not exist: $SOURCE_DIR"
  exit 1
fi

# Check if symlink already exists
if [ -L "$TARGET_DIR" ]; then
  EXISTING_TARGET="$(readlink "$TARGET_DIR")"
  if [ "$EXISTING_TARGET" = "$SOURCE_DIR" ]; then
    echo "Symlink already correctly configured: $TARGET_DIR -> $SOURCE_DIR"
    exit 0
  else
    echo "Warning: Symlink exists but points to: $EXISTING_TARGET"
    echo "Expected: $SOURCE_DIR"
    exit 1
  fi
fi

# Ensure parent directory exists
PARENT_DIR="$(dirname "$TARGET_DIR")"
if [ ! -d "$PARENT_DIR" ]; then
  echo "Error: Parent directory does not exist: $PARENT_DIR"
  echo "Create it with: mkdir -p $PARENT_DIR"
  exit 1
fi

# Handle existing directory
if [ -d "$TARGET_DIR" ]; then
  rmdir "$TARGET_DIR" 2>/dev/null || {
    echo "Error: $TARGET_DIR is not empty. Please remove it manually."
    exit 1
  }
fi

# Handle existing file
if [ -e "$TARGET_DIR" ]; then
  echo "Error: $TARGET_DIR exists but is not a symlink or directory."
  echo "Remove it with: rm $TARGET_DIR"
  exit 1
fi

# Create symlink
ln -s "$SOURCE_DIR" "$TARGET_DIR" || {
  echo "Error: Failed to create symlink"
  exit 1
}

echo "Successfully created symlink: $TARGET_DIR -> $SOURCE_DIR"
