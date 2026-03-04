# Claude Code Tool for OpenClaw

This document describes the `claude_code` tool that allows OpenClaw agents to invoke Claude Code CLI for coding tasks.

## Overview

The `claude_code` tool enables OpenClaw agents to delegate coding tasks to Claude Code CLI, similar to how chromemcp allows Claude to control browsers. This creates a powerful nested agent capability where OpenClaw agents can spawn Claude Code instances to perform development work.

## Installation

Ensure Claude Code CLI is installed:

```bash
npm install -g @anthropic-ai/claude-code
```

## Tool Reference

### Name
`claude_code`

### Actions

#### `version`
Check if Claude Code CLI is installed and get its version.

**Parameters:** None

**Example:**
```json
{
  "action": "version"
}
```

**Response:**
```json
{
  "version": "2.1.63 (Claude Code)",
  "installed": true
}
```

#### `run`
Execute a task with Claude Code CLI.

**Parameters:**
- `prompt` (required): Task description/prompt for Claude Code
- `workdir` (optional): Working directory for the task
- `permissionMode` (optional): Permission mode - `bypassPermissions`, `plan`, or `acceptEdits`
- `allowedTools` (optional): Array of allowed tools (e.g., `["Read", "Edit", "Bash"]`)
- `model` (optional): Model override (e.g., `claude-sonnet-4-6`, `claude-opus-4-6`)
- `timeout` (optional): Timeout in milliseconds (default: 300000 = 5 minutes)

**Examples:**

Simple task:
```json
{
  "action": "run",
  "prompt": "Fix the bug in src/utils.ts where null checking is missing",
  "workdir": "/path/to/project"
}
```

With permission bypass:
```json
{
  "action": "run",
  "prompt": "Refactor the authentication module",
  "workdir": "/path/to/project",
  "permissionMode": "bypassPermissions"
}
```

With tool whitelist:
```json
{
  "action": "run",
  "prompt": "Analyze the codebase structure",
  "workdir": "/path/to/project",
  "allowedTools": ["Read", "Grep", "Glob"]
}
```

With model override:
```json
{
  "action": "run",
  "prompt": "Implement a complex algorithm",
  "workdir": "/path/to/project",
  "model": "claude-opus-4-6"
}
```

**Response:**
```json
{
  "success": true,
  "exitCode": 0,
  "stdout": "Task completed successfully...",
  "stderr": "",
  "workdir": "/path/to/project"
}
```

## Use Cases

### 1. Code Review Agent
An OpenClaw agent can spawn Claude Code to perform detailed code reviews:
```json
{
  "action": "run",
  "prompt": "Review the PR at https://github.com/user/repo/pull/123. Check for code quality, security issues, and test coverage.",
  "workdir": "/workspace/repo",
  "allowedTools": ["Read", "Grep", "Glob", "Bash"]
}
```

### 2. Automated Refactoring
Delegate refactoring tasks to Claude Code:
```json
{
  "action": "run",
  "prompt": "Convert all callback-based functions to async/await in the src/api directory",
  "workdir": "/workspace/project",
  "permissionMode": "bypassPermissions"
}
```

### 3. Test Generation
Use Claude Code to generate tests:
```json
{
  "action": "run",
  "prompt": "Write comprehensive unit tests for src/calculator.ts using vitest",
  "workdir": "/workspace/project",
  "allowedTools": ["Read", "Edit", "Bash"]
}
```

### 4. Documentation Generation
Generate documentation automatically:
```json
{
  "action": "run",
  "prompt": "Generate API documentation from JSDoc comments in src/ and save to docs/api.md",
  "workdir": "/workspace/project"
}
```

## Architecture

This implementation follows the same pattern as other OpenClaw tools:

```
src/agents/tools/claude-code-tool.ts    # Tool implementation
src/agents/tools/claude-code-tool.test.ts  # Tests
src/agents/openclaw-tools.ts            # Tool registration
```

The tool:
1. Checks if Claude Code CLI is installed
2. Builds command-line arguments based on parameters
3. Spawns `claude` process with appropriate flags
4. Captures stdout/stderr and returns structured results
5. Handles timeouts and errors gracefully

## Comparison with chromemcp

| Feature | chromemcp | claude_code tool |
|---------|-----------|------------------|
| Protocol | MCP Server | OpenClaw Tool |
| Transport | stdio | Agent tool call |
| Use Case | Browser automation | Code editing |
| Invocation | Claude calls MCP | OpenClaw agent calls tool |
| Output | Screenshots, page data | Text output, exit code |

## Security Considerations

1. **Permission Modes**: Use appropriate permission modes:
   - `plan`: Claude Code shows plan before executing (safest)
   - `acceptEdits`: Automatically accepts edit suggestions
   - `bypassPermissions`: No prompts (use with caution)

2. **Tool Whitelisting**: Restrict which tools Claude Code can use with `allowedTools`

3. **Working Directory**: Ensure `workdir` is within allowed paths

4. **Timeouts**: Set reasonable timeouts to prevent runaway processes

## Troubleshooting

### "Claude Code CLI not found"
Install Claude Code:
```bash
npm install -g @anthropic-ai/claude-code
```

### Task times out
Increase timeout or break task into smaller chunks:
```json
{
  "action": "run",
  "prompt": "Smaller scoped task",
  "timeout": 600000  // 10 minutes
}
```

### Permission denied
Check that the working directory exists and is writable.

## References

- [chromemcp](https://github.com/mjodan-top/chromemcp) - Browser automation MCP server that inspired this implementation
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code/overview)
- [OpenClaw Tools Architecture](src/agents/tools/common.ts)
