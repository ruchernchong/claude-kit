#!/bin/bash
# Desktop notification hook for macOS
# Triggers: Notification event (when Claude Code needs user attention)
#
# Usage: This hook is called automatically by Claude Code.
# Input: JSON via stdin (not used for notifications)
# Output: None
# Exit: 0 (success)

osascript -e 'display notification "Claude Code needs your attention" with title "Claude Code" sound name "Glass"'
