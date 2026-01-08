# Testing Guide

Safe, isolated testing environment for Claude Code Powertools using Docker.

## Overview

This test suite uses **Alpine Linux** (minimal ~5MB image) in Docker containers to provide a clean, reproducible environment for testing installation scripts without affecting your actual system.

## Prerequisites

- Docker installed and running
- Docker Compose (v2 or standalone)

## Quick Start

```bash
# Run all tests
cd tests
./run-tests.sh

# Run specific test
./run-tests.sh claude      # Test Claude Code installation only

# Rebuild and run tests
./run-tests.sh --build all

# Interactive testing
./run-tests.sh interactive
```

## Available Tests

### `claude`
Tests Claude Code installation script in isolation:
- Creates symlinks to `~/.claude/commands/`
- Verifies all commands are installed
- Checks symlink count

### `idempotent`
Tests running the installer multiple times:
- Runs installer twice
- Verifies second run skips existing symlinks
- Ensures no duplicates or errors

### `symlinks`
Tests symlink integrity:
- Verifies all symlinks point to valid files
- Checks for broken links
- Validates symlink targets

### `warnings`
Tests warning messages in the installer:
- Verifies installer shows overwrite warning
- Checks backup functionality is mentioned
- Validates cancellation functionality

### `backup`
Tests automatic backup functionality:
- Creates real files in target directories
- Verifies .bak files are created on first backup
- Tests timestamped backups on subsequent runs
- Confirms symlinks are NOT backed up
- Validates backup counter in installation summary
- Checks original content is preserved in backups

### `interactive`
Starts an interactive bash session:
- Full access to test environment
- Manually run any installation script
- Inspect results with standard commands
- Type `exit` to leave

## Test Runner Options

```bash
./run-tests.sh [OPTIONS] [TEST]

Options:
  --build          Build Docker image before running tests
  --help, -h       Show help message

Tests:
  all              Run all tests (default)
  claude           Test Claude Code installation only
  idempotent       Test idempotency
  symlinks         Test symlink integrity
  warnings         Test warning messages
  backup           Test backup functionality
  interactive      Start interactive environment
```

## Examples

```bash
# Run all tests with fresh build
./run-tests.sh --build all

# Test only Claude Code installation
./run-tests.sh claude

# Manual testing in interactive mode
./run-tests.sh interactive
# Then inside container:
bash scripts/install-claude.sh
ls -la ~/.claude/commands/
exit
```

## Docker Compose Services

You can also run tests directly with docker-compose:

```bash
# Run specific service
docker-compose run --rm claude

# Build and run
docker-compose build
docker-compose run --rm symlinks

# Interactive mode
docker-compose run --rm interactive
```

## Test Environment

Each test runs in a fresh Alpine Linux container with:
- `bash` - Shell interpreter
- `git` - Version control (if needed)
- `coreutils` - Standard Unix utilities
- Test user (`testuser`) - Non-root user simulation
- Repository mounted at `/home/testuser/claude-powertools`

## Why Alpine Linux?

- **Minimal size**: ~5MB base image (vs 70MB+ for Ubuntu)
- **Fast**: Quick container startup and tear down
- **Sufficient**: Has all tools needed for bash scripts
- **Secure**: Smaller attack surface, regularly updated

## Cleaning Up

Docker automatically removes containers after tests (`--rm` flag).

To remove the test image:
```bash
docker rmi powertools-test-alpine
```

To clean all Docker resources:
```bash
docker system prune -a
```

## Troubleshooting

### Docker not found
```bash
# Install Docker Desktop from:
# https://www.docker.com/get-started
```

### Permission denied
```bash
# Make test runner executable
chmod +x run-tests.sh
```

### Tests failing
```bash
# Rebuild Docker image
./run-tests.sh --build all

# Run interactive mode to debug
./run-tests.sh interactive
```

## CI/CD Integration

Add to GitHub Actions:

```yaml
name: Test Installers
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          cd tests
          ./run-tests.sh --build all
```

## Development Workflow

1. **Make changes** to installation scripts
2. **Run tests** with `./run-tests.sh`
3. **Debug** with `./run-tests.sh interactive` if needed
4. **Commit** when all tests pass

## Notes

- Tests use volumes to mount the repository (changes reflect immediately)
- Each test starts with a clean home directory
- No need to rebuild image unless Dockerfile changes
- Tests are completely isolated from your host system
