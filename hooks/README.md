# Claude Code Hooks

A collection of useful hooks for Claude Code to enhance your development workflow with automatic formatting, command logging, safety checks, and desktop notifications.

## Available Hooks

### 🔔 notify.sh
**Trigger**: `Notification` event
**Type**: Synchronous
**Purpose**: Desktop notifications for macOS when Claude Code needs your attention

**Features**:
- macOS native notifications via AppleScript
- Sound alert ("Glass")
- Non-intrusive desktop notifications

**Configuration**:
```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "$HOME/.claude/hooks/notify.sh"
          }
        ]
      }
    ]
  }
}
```

---

### 📝 log-commands.sh
**Trigger**: `PostToolUse` for `Bash` tool
**Type**: Asynchronous
**Purpose**: Logs all bash commands Claude runs to `~/.claude/command-history.log`

**Features**:
- Timestamp for each command
- Persistent log file across sessions
- Non-blocking (async execution)
- Useful for auditing and debugging

**Log Format**:
```
[2026-02-13 12:46:17] echo test
[2026-02-13 12:47:32] git status
[2026-02-13 12:48:15] pnpm install
```

**Configuration**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "$HOME/.claude/hooks/log-commands.sh",
            "async": true
          }
        ]
      }
    ]
  }
}
```

**View Logs**:
```bash
# View recent commands
tail -20 ~/.claude/command-history.log

# Search for specific commands
grep "git" ~/.claude/command-history.log

# Monitor in real-time
tail -f ~/.claude/command-history.log
```

---

### 🛡️ block-dangerous.sh
**Trigger**: `PreToolUse` for `Bash` tool
**Type**: Synchronous (blocking)
**Purpose**: Blocks dangerous/destructive bash commands before execution

**Features**:
- Prevents accidental destructive operations
- Pattern matching for known dangerous commands
- Clear error messages with matched pattern
- Exit code 2 when blocked, 0 when allowed

**Blocked Patterns**:
- `rm -rf /` - Delete root
- `rm -rf /*` - Delete all root contents
- `dd if=` - Disk operations
- `mkfs` - Format filesystem
- `:(){ :|:& };:` - Fork bomb
- `FLUSHALL` - Redis flush all
- `FLUSHDB` - Redis flush database
- `> /dev/sda` - Overwrite disk
- `cat /dev/zero >` - Fill with zeros

**Configuration**:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "$HOME/.claude/hooks/block-dangerous.sh"
          }
        ]
      }
    ]
  }
}
```

**Example Output**:
```
❌ Blocked dangerous command: rm -rf /
   Pattern matched: rm -rf /
```

---

### ✨ auto-format.sh
**Trigger**: `PostToolUse` for `Write|Edit` tools
**Type**: Asynchronous
**Purpose**: Automatically formats files after Claude edits or writes them

**Features**:
- Smart package manager detection (pnpm > bun > yarn > npm)
- Formatter detection (biome, prettier, eslint)
- Respects project's `format` script in package.json
- Non-blocking (async execution)
- Silent operation (errors suppressed)

**Formatter Priority**:
1. `package.json` → `format` script (if exists)
2. `biome check --write`
3. `prettier --write`
4. `eslint --fix`

**Package Manager Detection**:
- Checks for lockfiles in order of preference
- `pnpm-lock.yaml` → pnpm
- `bun.lockb` → bun
- `yarn.lock` → yarn
- Default → npm

**Configuration**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "$HOME/.claude/hooks/auto-format.sh",
            "async": true
          }
        ]
      }
    ]
  }
}
```

---

## Installation

### Automatic (via bootstrap)

```bash
cd claude-kit
pnpm bootstrap
```

This will:
1. Create `~/.claude/hooks/` directory
2. Symlink all hooks from `hooks/` to `~/.claude/hooks/`
3. Update `~/.claude/settings.json` with hook configuration

### Manual Installation

1. **Create hooks directory**:
   ```bash
   mkdir -p ~/.claude/hooks
   ```

2. **Symlink hooks**:
   ```bash
   ln -s ~/Projects/claude-kit/hooks/notify.sh ~/.claude/hooks/notify.sh
   ln -s ~/Projects/claude-kit/hooks/log-commands.sh ~/.claude/hooks/log-commands.sh
   ln -s ~/Projects/claude-kit/hooks/block-dangerous.sh ~/.claude/hooks/block-dangerous.sh
   ln -s ~/Projects/claude-kit/hooks/auto-format.sh ~/.claude/hooks/auto-format.sh
   ```

3. **Make executable**:
   ```bash
   chmod +x ~/.claude/hooks/*.sh
   ```

4. **Update settings**:
   Add the hook configurations to `~/.claude/settings.json` (see Configuration sections above)

## Requirements

- **macOS** (for notify.sh - uses AppleScript)
- **jq** - JSON processor for parsing hook inputs
  ```bash
  brew install jq
  ```
- **Formatters** (optional, for auto-format.sh):
  - Biome: `npm install -g @biomejs/biome`
  - Prettier: `npm install -g prettier`
  - ESLint: `npm install -g eslint`

## Testing

### Test All Hooks

```bash
# Test command logging
echo '{"tool_input":{"command":"echo test"}}' | ~/.claude/hooks/log-commands.sh
tail -1 ~/.claude/command-history.log

# Test dangerous command blocker
echo '{"tool_input":{"command":"rm -rf /"}}' | ~/.claude/hooks/block-dangerous.sh
# Should output: ❌ Blocked dangerous command

# Test auto-format (requires a test file)
echo '{"tool_input":{"file_path":"./test.ts"}}' | ~/.claude/hooks/auto-format.sh

# Test notification
~/.claude/hooks/notify.sh
# Check for desktop notification
```

### Test Individual Hook

Each hook accepts JSON via stdin with this structure:

```json
{
  "tool_input": {
    "command": "bash command here",  // for log-commands.sh, block-dangerous.sh
    "file_path": "/path/to/file"     // for auto-format.sh
  }
}
```

## Troubleshooting

### Hooks not triggering automatically

1. **Check jq is installed**:
   ```bash
   which jq
   ```

2. **Verify symlinks**:
   ```bash
   ls -la ~/.claude/hooks/
   ```

3. **Check settings.json**:
   ```bash
   cat ~/.claude/settings.json | jq '.hooks'
   ```

4. **Test hooks manually** (see Testing section)

### Command logging not working

```bash
# Check if log file exists and is writable
ls -la ~/.claude/command-history.log

# Test the hook manually
echo '{"tool_input":{"command":"test"}}' | ~/.claude/hooks/log-commands.sh

# Check the log
tail ~/.claude/command-history.log
```

### Auto-format not working

```bash
# Check if formatters are installed
which biome
which prettier
which eslint

# Check if package.json has format script
jq '.scripts.format' package.json

# Test manually
echo '{"tool_input":{"file_path":"./src/test.ts"}}' | ~/.claude/hooks/auto-format.sh
```

### Notifications not appearing

```bash
# Test AppleScript (macOS only)
osascript -e 'display notification "Test" with title "Test"'

# Check macOS notification permissions
# System Preferences → Notifications → Terminal/iTerm
```

## Customization

### Add Custom Dangerous Patterns

Edit `block-dangerous.sh` and add patterns to the `DANGEROUS_PATTERNS` array:

```bash
DANGEROUS_PATTERNS=(
  "rm -rf /"
  "your-custom-pattern"
  "another-pattern"
)
```

### Change Notification Sound

Edit `notify.sh` and modify the sound name:

```bash
# Available sounds: Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink
osascript -e 'display notification "..." with title "..." sound name "Hero"'
```

### Add Custom Formatter

Edit `auto-format.sh` and add your formatter to the fallback chain:

```bash
elif command -v your-formatter >/dev/null 2>&1; then
  $PKG your-formatter --fix "$FILE" 2>/dev/null || true
fi
```

## Hook Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code Action                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   PreToolUse     │  ← block-dangerous.sh
                    │   (blocking)     │    (can prevent execution)
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Tool Execution  │  (Bash, Write, Edit, etc.)
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  PostToolUse     │  ← log-commands.sh
                    │   (async)        │  ← auto-format.sh
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Notification    │  ← notify.sh
                    │   (when needed)  │    (user attention required)
                    └──────────────────┘
```

## Contributing

To add a new hook:

1. Create a new `.sh` file in `hooks/`
2. Add shebang and documentation header
3. Make it executable: `chmod +x hooks/your-hook.sh`
4. Add configuration to `settings.json`
5. Update this README
6. Test thoroughly

## License

MIT
