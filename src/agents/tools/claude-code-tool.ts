import { exec } from "node:child_process";
import { promisify } from "node:util";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const execAsync = promisify(exec);

export const ClaudeCodeToolSchema = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["run", "version"],
      description: "Action to perform: run (execute task) or version (check CLI version)",
    },
    prompt: {
      type: "string",
      description: "Task prompt/description for Claude Code to execute (required for run action)",
    },
    workdir: {
      type: "string",
      description: "Working directory for the task (defaults to current directory)",
    },
    permissionMode: {
      type: "string",
      enum: ["bypassPermissions", "plan", "acceptEdits"],
      description: "Permission mode for Claude Code: bypassPermissions (no prompts), plan (show plan first), acceptEdits (accept edits mode)",
    },
    allowedTools: {
      type: "array",
      items: { type: "string" },
      description: "Allowed tools whitelist (e.g., ['Read', 'Edit', 'Bash'])",
    },
    model: {
      type: "string",
      description: "Model override (e.g., claude-sonnet-4-6, claude-opus-4-6)",
    },
    timeout: {
      type: "number",
      description: "Timeout in milliseconds (default: 300000 = 5 minutes)",
    },
  },
  required: ["action"],
} as const;

async function checkClaudeInstalled(): Promise<boolean> {
  try {
    await execAsync("claude --version", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function runClaudeCode(params: {
  prompt: string;
  workdir?: string;
  permissionMode?: string;
  allowedTools?: string[];
  model?: string;
  timeout?: number;
}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const args: string[] = [];

  // Add permission mode flag
  if (params.permissionMode) {
    switch (params.permissionMode) {
      case "bypassPermissions":
        args.push("--permission-mode", "bypassPermissions");
        break;
      case "plan":
        args.push("--permission-mode", "plan");
        break;
      case "acceptEdits":
        args.push("--permission-mode", "acceptEdits");
        break;
    }
  }

  // Add allowed tools
  if (params.allowedTools && params.allowedTools.length > 0) {
    args.push("--allowed-tools", params.allowedTools.join(","));
  }

  // Add model override
  if (params.model) {
    args.push("--model", params.model);
  }

  // Add the prompt (escape quotes for shell safety)
  const escapedPrompt = params.prompt.replace(/"/g, '\\"');
  args.push("-p", `"${escapedPrompt}"`);

  const command = `claude ${args.join(" ")}`;
  const timeoutMs = params.timeout ?? 300000; // Default 5 minutes

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: params.workdir,
      timeout: timeoutMs,
    });
    return {
      stdout,
      stderr,
      exitCode: 0,
    };
  } catch (error) {
    // exec throws an error if exit code is non-zero
    if (error && typeof error === "object" && "stdout" in error && "stderr" in error) {
      const execError = error as { stdout: string; stderr: string; code?: number };
      return {
        stdout: execError.stdout,
        stderr: execError.stderr,
        exitCode: execError.code ?? 1,
      };
    }
    throw error;
  }
}

async function getClaudeVersion(): Promise<string> {
  const { stdout, stderr } = await execAsync("claude --version", { timeout: 10000 });
  return stdout.trim() || stderr.trim() || "unknown";
}

export function createClaudeCodeTool(): AnyAgentTool {
  return {
    label: "Claude Code",
    name: "claude_code",
    description: [
      "Execute tasks using Claude Code CLI - an AI-powered coding assistant.",
      "Use this tool to delegate coding tasks, code reviews, refactoring, or any development work.",
      "Actions:",
      "- run: Execute a task with Claude Code (requires 'prompt' parameter)",
      "- version: Check Claude Code CLI version",
      "",
      "Parameters for 'run':",
      "- prompt (required): The task description/prompt for Claude Code",
      "- workdir: Working directory (defaults to current)",
      "- permissionMode: bypassPermissions | plan | acceptEdits",
      "- allowedTools: Array of allowed tools (e.g., ['Read', 'Edit', 'Bash'])",
      "- model: Model override (claude-sonnet-4-6, claude-opus-4-6)",
      "- timeout: Timeout in milliseconds (default: 300000 = 5 min)",
      "",
      "Examples:",
      'Run task: { action: "run", prompt: "Fix the bug in src/utils.ts", workdir: "/path/to/project" }',
      'With permissions: { action: "run", prompt: "Refactor code", permissionMode: "bypassPermissions" }',
      'With tool whitelist: { action: "run", prompt: "Analyze code", allowedTools: ["Read", "Grep"] }',
    ].join(" "),
    parameters: ClaudeCodeToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const action = readStringParam(params, "action", { required: true });

      // Check if Claude Code is installed
      const isInstalled = await checkClaudeInstalled();
      if (!isInstalled) {
        throw new Error(
          "Claude Code CLI not found. Please install it: npm install -g @anthropic-ai/claude-code"
        );
      }

      switch (action) {
        case "version": {
          const version = await getClaudeVersion();
          return jsonResult({
            version,
            installed: true,
          });
        }

        case "run": {
          const prompt = readStringParam(params, "prompt", { required: true });
          const workdir = readStringParam(params, "workdir");
          const permissionMode = readStringParam(params, "permissionMode");
          const allowedTools = Array.isArray(params.allowedTools)
            ? params.allowedTools.filter((t): t is string => typeof t === "string")
            : undefined;
          const model = readStringParam(params, "model");
          const timeout = typeof params.timeout === "number" ? params.timeout : undefined;

          const result = await runClaudeCode({
            prompt,
            workdir: workdir ?? undefined,
            permissionMode: permissionMode ?? undefined,
            allowedTools,
            model: model ?? undefined,
            timeout,
          });

          return jsonResult({
            success: result.exitCode === 0,
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
            workdir: workdir ?? process.cwd(),
          });
        }

        default:
          throw new Error(`Unknown action: ${action}. Use 'run' or 'version'.`);
      }
    },
  };
}
