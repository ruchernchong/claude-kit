---
name: create-issue
description: >-
  Create a GitHub issue with title, description, labels, and auto-assignment via MCP tools.
  Use when opening an issue, filing a bug, creating a feature request, or reporting a problem on GitHub.
allowed-tools: Bash(gh repo view) mcp__github__list_issue_types mcp__github__issue_write mcp__github__get_me
metadata:
  model: sonnet
---

## Language Conventions

**Infer language style from the project:**
- Analyze existing issues, documentation, and commit messages to detect the project's language variant (US English, UK English, etc.)
- Match the spelling conventions found in the project (e.g., "initialize" vs "initialise", "behavior" vs "behaviour")
- Maintain consistency with the project's established language style throughout issue titles and descriptions

---

Create a GitHub issue with the following workflow:

1. Check if we're in a GitHub repository and get owner/repo info
2. **Check for organization issue types:**
   - Use `github/list_issue_types` MCP tool with the repository owner
   - If issue types exist, select the most appropriate type based on the issue context (e.g., "Bug", "Feature", "Task")
   - Note: This will fail for user-owned repositories (not organizations) - this is expected, proceed without issue type
3. **Check for ISSUE_TEMPLATE format:**
   - Look for issue templates in `.github/ISSUE_TEMPLATE/` or `.github/` directories
   - If templates exist, use the most appropriate template format (bug report, feature request, etc.)
   - Parse template structure and fill in the required sections
4. **If no ISSUE_TEMPLATE exists, use custom format:**
   - Infer issue title from user's request context
   - Generate appropriate issue description based on the context
5. **Get current user for assignment:**
   - Use `github/get_me` MCP tool to get the current authenticated user's login
6. **Create issue using `github/issue_write` MCP tool:**
   - Set `method: "create"`
   - Include `owner`, `repo`, `title`, `body`
   - Include `type` parameter if organization issue types are available (from step 2)
   - Include `assignees` array with current user's login for self-assignment
   - If assignment fails (user not a collaborator), the issue will still be created without assignment
7. Optionally add existing labels or milestone (only use labels that already exist in the repository)
   - Additional assignees can be added to the `assignees` array

**Issue title**: Use natural, descriptive language (not conventional commits format). Keep it concise and specific.

**Issue description**: Include clear problem statement or feature request with steps to reproduce (for bugs). If an ISSUE_TEMPLATE exists, follow its structure and required fields exactly.
