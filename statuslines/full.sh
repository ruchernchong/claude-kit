#!/bin/bash
# Full-featured Claude Code statusline
# Displays: project, branch, model, version, context usage, cost, tokens

# Read JSON from stdin
INPUT=$(cat)

# Parse fields using jq (with defaults for missing fields)
PROJECT=$(echo "$INPUT" | jq -r '.cwd // "" | split("/") | last // "unknown"')
BRANCH=$(echo "$INPUT" | jq -r '.git.branch // "no-branch"')
MODEL=$(echo "$INPUT" | jq -r '.model // "unknown"')
VERSION=$(echo "$INPUT" | jq -r '.claudeVersion // "?"')
CONTEXT_USED=$(echo "$INPUT" | jq -r '.contextUsed // 0')
CONTEXT_TOTAL=$(echo "$INPUT" | jq -r '.contextTotal // 200000')
COST=$(echo "$INPUT" | jq -r '.sessionCost // 0')
INPUT_TOKENS=$(echo "$INPUT" | jq -r '.inputTokens // 0')
OUTPUT_TOKENS=$(echo "$INPUT" | jq -r '.outputTokens // 0')
SESSION_DURATION=$(echo "$INPUT" | jq -r '.sessionDuration // 0')

# Format model name (extract key part)
case "$MODEL" in
  *opus*) MODEL_DISPLAY="Opus" ;;
  *sonnet*) MODEL_DISPLAY="Sonnet" ;;
  *haiku*) MODEL_DISPLAY="Haiku" ;;
  *) MODEL_DISPLAY="${MODEL:0:10}" ;;
esac

# Calculate context percentage and progress bar
if [ "$CONTEXT_TOTAL" -gt 0 ]; then
  CONTEXT_PCT=$((CONTEXT_USED * 100 / CONTEXT_TOTAL))
else
  CONTEXT_PCT=0
fi

# Build progress bar (10 chars wide)
FILLED=$((CONTEXT_PCT / 10))
EMPTY=$((10 - FILLED))
BAR=""
for ((i=0; i<FILLED; i++)); do BAR+="="; done
for ((i=0; i<EMPTY; i++)); do BAR+="-"; done

# Format token count (K/M)
format_tokens() {
  local tokens=$1
  if [ "$tokens" -ge 1000000 ]; then
    printf "%.1fM" "$(echo "scale=1; $tokens / 1000000" | bc)"
  elif [ "$tokens" -ge 1000 ]; then
    printf "%.0fK" "$(echo "scale=0; $tokens / 1000" | bc)"
  else
    echo "$tokens"
  fi
}

TOTAL_TOKENS=$((INPUT_TOKENS + OUTPUT_TOKENS))
TOKENS_DISPLAY=$(format_tokens "$TOTAL_TOKENS")

# Calculate burn rate (cost per hour)
if [ "$SESSION_DURATION" -gt 0 ]; then
  # SESSION_DURATION is in seconds, convert to hours
  BURN_RATE=$(echo "scale=2; $COST * 3600 / $SESSION_DURATION" | bc 2>/dev/null || echo "0")
else
  BURN_RATE="0"
fi

# Format cost display
COST_DISPLAY=$(printf "%.2f" "$COST")
BURN_DISPLAY=$(printf "%.2f" "$BURN_RATE")

# Output 3 lines
echo "📁 $PROJECT 🌿 $BRANCH 🤖 $MODEL_DISPLAY 📟 v$VERSION"
echo "🧠 Context: ${CONTEXT_PCT}% [${BAR}]"
echo "💰 \$${COST_DISPLAY} (\$${BURN_DISPLAY}/h) 📊 ${TOKENS_DISPLAY} tok"
