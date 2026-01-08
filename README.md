# Claude Kit

A collection of powertools for [Claude Code](https://claude.ai/code) including specialized agents and slash commands.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run the interactive setup:
   ```bash
   pnpm setup
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
| api-designer | Designs REST and GraphQL APIs |
| api-researcher | Researches APIs and integration patterns |
| cache-strategist | Designs caching strategies |
| ci-cd-helper | Sets up CI/CD pipelines |
| cloud-architect | Designs cloud infrastructure |
| code-reviewer | Reviews code for quality, bugs, and security |
| codebase-explorer | Explores and explains codebase structure |
| component-builder | Builds reusable UI components |
| css-optimizer | Optimizes CSS and removes unused styles |
| database-optimizer | Optimizes database queries and schema |
| debug-assistant | Diagnoses bugs from errors and stack traces |
| dependency-updater | Analyzes dependencies and suggests updates |
| design-system-helper | Maintains design system consistency |
| dockerfile-writer | Creates optimized Dockerfiles |
| documentation-writer | Generates documentation |
| error-handler | Implements error handling patterns |
| git-helper | Assists with git operations |
| library-evaluator | Evaluates libraries for project fit |
| logging-assistant | Sets up structured logging |
| migration-assistant | Helps plan database and schema migrations |
| monitoring-setup | Configures monitoring and alerting |
| performance-optimizer | Identifies performance bottlenecks |
| refactor-assistant | Helps refactor code following best practices |
| responsive-checker | Checks responsive design and breakpoints |
| security-auditor | Audits code for security vulnerabilities |
| test-writer | Generates tests for code |

## Available Slash Commands

Slash commands are user-invocable. Type `/command-name` to invoke.

### Core Development

| Command | Description |
|---------|-------------|
| `/build` | Intelligent build detection and execution |
| `/test` | Smart test runner (Jest, Vitest, Mocha, etc.) |
| `/lint` | JavaScript/TypeScript linting and formatting |
| `/setup` | Automated dependency installation |
| `/clean` | Safe cleanup of build artifacts |

### Git & Project Management

| Command | Description |
|---------|-------------|
| `/commit` | Smart git commit with GitLeaks security check and concise messages |
| `/new-branch` | Create branches with GitHub issue integration |
| `/new-issue` | GitHub issue creation with template support |
| `/new-pr` | Automated PR creation with commit analysis |
| `/sync-docs` | Documentation maintenance for CLAUDE.md and README.md |
| `/update-issue` | Update GitHub issue title, body, labels, or assignees |

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

- `pnpm setup` - Interactive setup wizard
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

## License

MIT
