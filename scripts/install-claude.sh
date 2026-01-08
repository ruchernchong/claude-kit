#!/bin/bash

# Symlink installer for Claude Code slash commands
# Creates symlinks from this repository to ~/.claude/commands/

set -e

# Get script directory and source helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
source "$ROOT_DIR/lib/helpers.sh"

# Configuration
COMMANDS_DIR="$ROOT_DIR/commands"
COMMANDS_INSTALL_DIR="${HOME}/.claude/commands"
SELECTED_COMMANDS=("$@")

# Ensure install directory exists
mkdir -p "$COMMANDS_INSTALL_DIR"

echo -e "${BLUE}🔗 Installing Claude Code slash commands${NC}"
echo -e "${BLUE}Source:       ${COMMANDS_DIR}${NC}"
echo -e "${BLUE}Installing to: ${COMMANDS_INSTALL_DIR}${NC}"
echo ""

# Warning about overwriting
echo -e "${YELLOW}⚠️  WARNING: Existing commands will be overwritten!${NC}"
echo -e "${YELLOW}   We will attempt to backup your existing commands before overwriting.${NC}"
echo -e "${YELLOW}   Backups will be saved with a .bak extension.${NC}"
echo ""

# Reset counters
reset_counters

# Build list of command files to install
COMMAND_FILES=()
if [ ${#SELECTED_COMMANDS[@]} -gt 0 ]; then
    for cmd in "${SELECTED_COMMANDS[@]}"; do
        [ -n "$cmd" ] || continue
        file="$COMMANDS_DIR/${cmd}.md"
        if [ -f "$file" ]; then
            COMMAND_FILES+=("$file")
        else
            echo -e "${YELLOW}⏭  Skipped: /${cmd} (not found)${NC}"
        fi
    done
else
    for file in "$COMMANDS_DIR"/*.md; do
        [ -e "$file" ] || continue
        COMMAND_FILES+=("$file")
    done
fi

if [ ${#COMMAND_FILES[@]} -eq 0 ]; then
    echo -e "${RED}✗  No command files found for installation${NC}"
    exit 1
fi

DISPLAY_COMMANDS=()
for file in "${COMMAND_FILES[@]}"; do
    DISPLAY_COMMANDS+=("$(basename "$file" .md)")
done

# Install command files
echo -e "${BLUE}📦 Installing slash commands:${NC}"
for file in "${COMMAND_FILES[@]}"; do
    filename=$(basename "$file")
    create_symlink "$file" "$COMMANDS_INSTALL_DIR" "$filename"
done

# Print summary
print_summary

if [ $INSTALLED -gt 0 ] || [ $SKIPPED -gt 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Claude Code slash commands installation complete!${NC}"

    echo ""
    echo "Available commands (type /command-name):"
    for cmd in "${DISPLAY_COMMANDS[@]}"; do
        if [ -n "$cmd" ]; then
            echo "  • /${cmd}"
        fi
    done

    echo ""
    echo -e "${BLUE}💡 Tip: To update commands, run 'git pull' in ${ROOT_DIR}${NC}"
fi

exit 0
