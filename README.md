# Agents

A collection of specialized agent definitions for [Claude Code](https://claude.ai/code).

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create the symlink to make agents available to Claude Code:
   ```bash
   ./setup.sh
   ```

   This creates a symlink from `~/.claude/agents` to the `agents/` directory in this repo.

## Available Agents

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

## Creating New Agents

Add a new markdown file in the `agents/` directory with this format:

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
- **tools**: Comma-separated list of allowed tools (Read, Grep, Glob, Edit, Write, Bash)
- **model**: Preferred model (`sonnet`, `opus`, or `haiku`)

## Development

```bash
# Check for linting issues
pnpm biome check .

# Fix linting issues
pnpm biome check . --write
```

## License

MIT
