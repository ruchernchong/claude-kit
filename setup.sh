#!/usr/bin/env zsh
# setup.sh - Creates symlinks to make agents, commands, and skills available to Claude Code
set -euo pipefail

SCRIPT_DIR="${0:A:h}"

setup_symlink() {
  local name="$1"
  local source_dir="$SCRIPT_DIR/$name"
  local target_dir="$HOME/.claude/$name"

  # Verify source directory exists
  if [ ! -d "$source_dir" ]; then
    echo "Skipping $name: source directory does not exist"
    return 0
  fi

  # Check if symlink already exists
  if [ -L "$target_dir" ]; then
    existing_target="$(readlink "$target_dir")"
    if [ "$existing_target" = "$source_dir" ]; then
      echo "✓ $name: already configured"
      return 0
    else
      echo "✗ $name: symlink exists but points to: $existing_target"
      return 1
    fi
  fi

  # Ensure parent directory exists
  parent_dir="$(dirname "$target_dir")"
  if [ ! -d "$parent_dir" ]; then
    mkdir -p "$parent_dir"
  fi

  # Handle existing directory
  if [ -d "$target_dir" ]; then
    rmdir "$target_dir" 2>/dev/null || {
      echo "✗ $name: $target_dir is not empty. Please remove it manually."
      return 1
    }
  fi

  # Handle existing file
  if [ -e "$target_dir" ]; then
    echo "✗ $name: $target_dir exists but is not a symlink or directory."
    return 1
  fi

  # Create symlink
  ln -s "$source_dir" "$target_dir" || {
    echo "✗ $name: failed to create symlink"
    return 1
  }

  echo "✓ $name: created symlink -> $source_dir"
}

setup_file_symlink() {
  local name="$1"
  local source_file="$SCRIPT_DIR/$name"
  local target_file="$HOME/$name"

  # Verify source file exists
  if [ ! -f "$source_file" ]; then
    echo "Skipping $name: source file does not exist"
    return 0
  fi

  # Check if symlink already exists
  if [ -L "$target_file" ]; then
    existing_target="$(readlink "$target_file")"
    if [ "$existing_target" = "$source_file" ]; then
      echo "✓ $name: already configured"
      return 0
    else
      echo "✗ $name: symlink exists but points to: $existing_target"
      return 1
    fi
  fi

  # Handle existing file
  if [ -e "$target_file" ]; then
    echo "✗ $name: $target_file exists but is not a symlink. Please remove it manually."
    return 1
  fi

  # Create symlink
  ln -s "$source_file" "$target_file" || {
    echo "✗ $name: failed to create symlink"
    return 1
  }

  echo "✓ $name: created symlink -> $source_file"
}

echo "Setting up Claude Code symlinks..."
echo

errors=0
for name in agents commands skills; do
  setup_symlink "$name" || ((errors++)) || true
done

# Setup file symlinks
for name in .mcp.json; do
  setup_file_symlink "$name" || ((errors++)) || true
done

echo
if [ $errors -eq 0 ]; then
  echo "Setup complete!"
else
  echo "Setup completed with $errors error(s)"
  exit 1
fi
