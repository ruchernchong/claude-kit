# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A collection of powertools for Claude Code including specialized agents and slash commands. Each is a markdown file with YAML frontmatter defining its configuration, followed by detailed behavioral instructions.

- **Agents**: Specialized subagents for complex tasks (code review, testing, debugging, etc.)
- **Slash Commands**: User-invocable commands for development workflows (invoke with `/command-name`)

## Commands

```bash
# Install dependencies
pnpm install

# Lint and format code
pnpm biome check .          # Check for issues
pnpm biome check . --write  # Fix issues automatically

# Setup symlinks (makes agents and commands available to Claude Code)
./setup.sh                  # Creates ~/.claude/agents and ~/.claude/commands symlinks

# Run tests
cd tests && ./run-tests.sh
```

## Architecture

### Directory Structure

```
.
├── agents/            # Specialized agent definitions (29 agents)
├── commands/          # Slash command definitions (16 commands)
├── scripts/           # Installation scripts
│   └── install-claude.sh
├── tests/             # Docker-based test infrastructure
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── run-tests.sh
├── lib/               # Shared utilities
│   └── helpers.sh
└── setup.sh           # Main setup script
```

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

### Slash Command Format

Each command in `commands/` follows this structure:

```markdown
---
description: Command description (what it does and when to use it)
model: sonnet  # Optional: specify Claude model
allowed-tools: List of permitted tools
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

### Slash Commands Available

Invoke with `/command-name`:

- `/build` - Intelligent build detection and execution
- `/test` - Smart test runner (Jest, Vitest, Mocha, etc.)
- `/lint` - JavaScript/TypeScript linting and formatting
- `/setup` - Automated dependency installation
- `/clean` - Safe cleanup of build artifacts
- `/commit` - Smart git commit with balanced change grouping
- `/create-branch` - Create branches with GitHub issue integration
- `/create-issue` - GitHub issue creation with template support
- `/create-pull-request` - Automated PR creation with commit analysis
- `/update-issue` - Update GitHub issue title, body, labels, or assignees
- `/update-docs` - Documentation maintenance

### Smart Detection System

Commands automatically detect and adapt to:
- **Package Managers**: pnpm > bun > yarn > npm (based on lock files)
- **Build Tools**: Webpack, Vite, Rollup, Parcel, Next.js, Nuxt
- **Testing**: Jest, Vitest, Mocha, Cypress, Playwright
- **Linting**: ESLint, Prettier

## Conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint)
- Semantic versioning with automated releases via semantic-release
