---
name: sync-docs
description: >-
  Update and maintain CLAUDE.md and README.md documentation by scanning project structure for changes.
  Use when updating the readme, editing CLAUDE.md, syncing project docs, or refreshing documentation after codebase changes.
allowed-tools: Read(*) Write(*) Edit(*) MultiEdit(*) Glob(*) Grep(*) Bash(npm*) Bash(yarn*) Bash(find*) Bash(ls*) WebFetch(*)
metadata:
  model: sonnet
---

Update and maintain project documentation for CLAUDE.md and README.md.

## Workflow

1. **Scan project structure** for changes:
   ```bash
   # Check build config files
   find . -maxdepth 2 -name "package.json" -o -name "Makefile" -o -name "pyproject.toml" -o -name "Cargo.toml" | head -10
   # Check for new scripts
   npm pkg get scripts 2>/dev/null || true
   ```

2. **Update CLAUDE.md**: Sync build commands, coding conventions, tool commands, and environment setup with actual project state.

3. **Update README.md**: Refresh installation steps, usage examples, and project status.

4. **Cross-reference**: Compare documented instructions against project structure. Identify stale sections.

5. **Validate**:
   ```bash
   # Verify documented commands work
   npm test 2>&1 | tail -5
   npm run build 2>&1 | tail -5
   ```
   - Test installation steps from a fresh perspective
   - Check that CLAUDE.md instructions match current setup
   - Ensure README.md accurately represents current state
