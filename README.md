# Claude Kit

> A collection of powertools for [Claude Code](https://claude.ai/code) including specialized agents, slash commands, and skills.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/github-ruchernchong%2Fclaude--kit-blue?logo=github)](https://github.com/ruchernchong/claude-kit)

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run the interactive setup:
   ```bash
   pnpm bootstrap
   ```

   This creates symlinks:
   - `~/.claude/agents` -> `agents/`
   - `~/.claude/commands` -> `commands/`
   - `~/.claude/skills` -> `skills/`
   - `~/.mcp.json` -> `.mcp.json`

3. (Optional) Install specific commands:
   ```bash
   pnpm install-commands
   ```

   Select which slash commands to install using an interactive multi-select menu.

## Available Agents

Agents are specialized subagents for complex, multi-step tasks. They're invoked via the Task tool.

| Agent | Description |
|-------|-------------|
| accessibility-checker | Checks UI code for accessibility compliance |
| api-designer | Designs REST APIs with Hono |
| api-researcher | Researches APIs and integration patterns |
| cache-strategist | Designs caching strategies with Upstash Redis |
| ci-cd-helper | Sets up CI/CD pipelines |
| code-reviewer | Reviews code for quality, bugs, and security |
| component-builder | Builds reusable UI components with Next.js, HeroUI v3, and Tailwind CSS v4 |
| css-optimizer | Optimizes CSS and Tailwind usage |
| database-optimizer | Optimizes database queries and schema with Drizzle ORM and Neon Postgres |
| debug-assistant | Diagnoses bugs from errors and stack traces |
| dependency-updater | Analyzes dependencies and suggests updates |
| design-system-helper | Maintains design system consistency with HeroUI v3 and Tailwind CSS v4 |
| library-evaluator | Evaluates libraries for project fit |
| migration-assistant | Helps plan database migrations with Drizzle |
| refactor-assistant | Helps refactor code following best practices |
| responsive-checker | Checks responsive design and breakpoints |
| security-auditor | Audits code for security vulnerabilities |
| test-writer | Generates tests with Vitest and React Testing Library |

## Available Slash Commands

Slash commands are user-invocable. Type `/command-name` to invoke.

| Command | Description |
|---------|-------------|
| `/commit` | Smart git commit with GitLeaks security check and concise messages |
| `/new-branch` | Create branches with GitHub issue integration |
| `/new-issue` | GitHub issue creation with template support |
| `/new-pr` | Automated PR creation with commit analysis |
| `/sync-docs` | Documentation maintenance for CLAUDE.md and README.md |
| `/update-issue` | Update GitHub issue title, body, labels, or assignees |

## Available Skills

Skills are multi-command workflows that combine multiple operations:

| Skill | Description |
|-------|-------------|
| `security` | Run security audit with GitLeaks pre-commit hook setup and code analysis |
| `tailwind` | Audit and fix Tailwind CSS anti-patterns (spacing direction, size-*, gap preference, 8px grid, etc.) |

## Creating New Agents

Add a new markdown file in the `agents/` directory:

```markdown
---
name: my-agent
description: Brief description of when to use this agent
tools: Read, Grep, Glob, Edit, Write, Bash
model: sonnet
---

Detailed instructions for the agent's behavior...
```

### Frontmatter Fields

- **name**: Unique identifier for the agent
- **description**: When Claude should use this agent
- **tools**: Comma-separated list of allowed tools
- **model**: Preferred model (`sonnet`, `opus`, or `haiku`)

## Creating New Slash Commands

Add a new markdown file in the `commands/` directory:

```markdown
---
description: Command description (what it does and when to use it)
model: sonnet
allowed-tools: Bash(npm run *), Read(*), Grep
---

Detailed instructions for the command's behavior...
```

### Frontmatter Fields

- **description**: What the command does and when to use it
- **model**: (Optional) Preferred Claude model
- **allowed-tools**: List of permitted tools with optional patterns

## Development

```bash
# Check for linting issues
pnpm biome check .

# Fix linting issues
pnpm biome check . --write

# Type check TypeScript
pnpm exec tsc --noEmit

# Run tests (interactive)
pnpm test:docker
```

### CLI Tools

The project uses TypeScript with [@clack/prompts](https://github.com/natemoo-re/clack) for interactive CLI tools:

- `pnpm bootstrap` - Interactive setup wizard
- `pnpm install-commands` - Select commands to install
- `pnpm test:docker` - Interactive test runner

All CLI tools feature:
- Beautiful interactive prompts
- Multi-select menus
- Progress spinners
- Graceful cancellation (Ctrl+C)
- Colored output

## Updating

```bash
git pull
```

The symlinks automatically reflect updates - no reinstallation needed.

## Project Structure

```
.
├── agents/            # 18 specialized agent definitions
├── commands/          # 6 slash command definitions
├── skills/            # 2 multi-command workflows
│   ├── security/      # Security audit skill
│   └── tailwind/      # Tailwind CSS optimization skill
├── src/               # TypeScript CLI source code
├── tests/             # Docker-based test infrastructure
└── .mcp.json          # MCP server configuration
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed version history.

## License

MIT © [Ru Chern Chong](https://github.com/ruchernchong)
