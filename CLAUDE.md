# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A collection of powertools for Claude Code including specialized agents, skills, and MCP server configuration. Each is a markdown file with YAML frontmatter defining its configuration, followed by detailed behavioral instructions.

- **Agents**: Specialized subagents for complex tasks (code review, testing, debugging, etc.)
- **Skills**: User-invocable workflows and commands (invoke with `/skill-name`)
- **MCP Config**: Pre-configured MCP servers for extended capabilities

## Commands

```bash
# Install dependencies
pnpm install

# Lint and format code
pnpm biome check .          # Check for issues
pnpm biome check . --write  # Fix issues automatically

# Setup and installation
pnpm bootstrap              # Interactive setup - creates symlinks in ~/.claude/ and ~/.mcp.json
pnpm install-statusline     # Interactive statusline installer - configure Claude Code statusline

# Run tests
pnpm test:docker            # Interactive test runner with Docker
```

## Architecture

### Directory Structure

```
.
├── agents/            # Specialized agent definitions (16 agents)
├── skills/            # Skills and commands (invoke with /skill-name)
│   ├── commit/        # Smart git commit
│   ├── create-branch/ # Branch creation with GitHub issue integration
│   ├── create-issue/  # GitHub issue creation
│   ├── create-pr/     # Pull request creation
│   ├── sync-docs/     # Documentation sync
│   ├── update-issue/  # GitHub issue updates
│   ├── security/      # Security audit skill
│   ├── tailwind/      # Tailwind CSS optimization skill
│   └── ...            # Other skills (heroui, folder-org, etc.)
├── statuslines/       # Statusline scripts for Claude Code
├── src/               # TypeScript CLI source
│   ├── setup.ts               # Interactive setup script
│   ├── install-statusline.ts  # Interactive statusline installer (supports --ci flag)
│   ├── test-runner.ts         # Interactive test runner
│   ├── utils.ts               # Shared utilities (symlinks, file ops)
│   └── utils.test.ts          # Unit tests for utilities
├── tests/             # Docker-based test infrastructure
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── run-tests.sh           # Test runner script
│   └── README.md              # Test documentation
├── .mcp.json          # MCP server configuration (symlinked to $HOME/.mcp.json)
└── tsconfig.json      # TypeScript configuration
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

### Skill Format

Each skill in `skills/<skill-name>/SKILL.md` follows this structure:

```markdown
---
name: skill-name
description: Skill description (what it does and when to use it)
model: sonnet  # Optional: specify Claude model
allowed-tools: List of permitted tools
---

[Detailed instructions and behavior guidelines]
```

### Agent Categories

- **Code quality**: security-auditor
- **Testing**: test-writer, debug-assistant
- **Infrastructure**: ci-cd-helper
- **Database**: database-optimizer, migration-assistant, cache-strategist
- **Frontend**: component-builder, css-optimizer, responsive-checker, design-system-helper, accessibility-checker
- **Dependencies**: dependency-updater, library-evaluator
- **API**: api-designer, api-researcher

### Skills Available

Invoke with `/skill-name`:

**Git & GitHub Workflows:**
- `/commit` - Smart git commit with GitLeaks security check and concise messages
- `/create-branch` - Create branches with GitHub issue integration
- `/create-issue` - GitHub issue creation with template support
- `/create-pr` - Automated PR creation with commit analysis
- `/update-issue` - Update GitHub issue title, body, labels, or assignees

**Code Quality & Documentation:**
- `/security` - Run security audit with GitLeaks pre-commit hook setup and code analysis
- `/tailwind` - Audit and fix Tailwind CSS anti-patterns (spacing, size-*, gap, 8px grid, etc.)
- `/sync-docs` - Sync documentation with project state
- `/web-design-guidelines` - Review UI code for Web Interface Guidelines compliance

**Development Helpers:**
- `/folder-org` - Project code structure and file organization guidance
- `/heroui` - Build accessible UIs using HeroUI v3 components
- `/react-best-practices` - React and Next.js performance optimization guidelines

## CLI Tools

The project includes interactive TypeScript CLI tools built with [@clack/prompts](https://github.com/natemoo-re/clack):

- **setup.ts** - Interactive setup wizard with confirmation prompts and progress spinners
- **install-statusline.ts** - Statusline installer for configuring Claude Code statusline
- **test-runner.ts** - Interactive test selection and Docker integration
- **utils.ts** - Shared utilities for symlink management and file operations

All tools provide:
- Beautiful interactive prompts
- Progress spinners for long operations
- Graceful cancellation (Ctrl+C)
- Colored output and summaries

## Statuslines

Statuslines display real-time information in the Claude Code interface. Install with `pnpm install-statusline`.

- **full** - 3-line display showing project, branch, model, version, context usage, cost, and tokens

## Conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint)
- Semantic versioning with automated releases via semantic-release
- No single-letter variable names (use descriptive names like `result`, not `r`)
- TypeScript code formatted with Biome
