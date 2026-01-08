#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/agents"
TARGET_DIR="$HOME/.claude/agents"

if [ -L "$TARGET_DIR" ]; then
  echo "Symlink already exists: $TARGET_DIR -> $(readlink "$TARGET_DIR")"
  exit 0
fi

if [ -d "$TARGET_DIR" ]; then
  rmdir "$TARGET_DIR" 2>/dev/null || {
    echo "Error: $TARGET_DIR is not empty. Please remove it manually."
    exit 1
  }
fi

ln -s "$SOURCE_DIR" "$TARGET_DIR"
echo "Created symlink: $TARGET_DIR -> $SOURCE_DIR"
