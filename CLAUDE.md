# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A collection of specialized agent definitions for Claude Code. Each agent is a markdown file with YAML frontmatter defining its name, description, available tools, and model preference, followed by detailed behavioral instructions.

## Commands

```bash
# Install dependencies
pnpm install

# Lint and format code
pnpm biome check .          # Check for issues
pnpm biome check . --write  # Fix issues automatically

# Setup agent symlink (makes agents available to Claude Code)
./setup.sh                  # Creates ~/.claude/agents -> ./agents symlink
```

## Architecture

### Agent Definition Format

Each agent in `agents/` follows this structure:

```markdown
---
name: agent-name
description: Brief description for when to use this agent
tools: Read, Grep, Glob, Edit, Write, Bash (comma-separated)
model: sonnet | opus | haiku
---

[Detailed instructions and behavior guidelines]
```

### Agent Categories

- **Code quality**: code-reviewer, refactor-assistant, security-auditor
- **Testing**: test-writer, debug-assistant
- **Infrastructure**: ci-cd-helper, dockerfile-writer, cloud-architect, monitoring-setup
- **Database**: database-optimizer, migration-assistant, cache-strategist
- **Frontend**: component-builder, css-optimizer, responsive-checker, design-system-helper, accessibility-checker
- **Documentation**: documentation-writer, logging-assistant
- **Dependencies**: dependency-updater, library-evaluator
- **API**: api-designer, api-researcher
- **Git**: git-helper
- **Architecture**: codebase-explorer, error-handler, performance-optimizer

## Conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint)
- Semantic versioning with automated releases via semantic-release
