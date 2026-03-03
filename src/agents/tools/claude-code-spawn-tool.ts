import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Type } from "@sinclair/typebox";
import { optionalStringEnum } from "../schema/typebox.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam } from "./common.js";

const execAsync = promisify(exec);

// dispatch.sh 路径 - 使用环境变量或默认值
const DISPATCH_SCRIPT =
  process.env.OPENCLAW_CLAUDE_CODE_DISPATCH_SCRIPT ||
  "/Users/zkf/work/claude-code-dispatch/scripts/dispatch.sh";

// 允许的工作目录前缀
const ALLOWED_WORKDIR_PREFIXES = ["/Users/zkf/work"];

const ClaudeCodeSpawnToolSchema = Type.Object({
  task: Type.String({ description: "开发任务描述" }),
  workdir: Type.String({ description: "工作目录路径" }),
  taskName: Type.Optional(Type.String({ description: "任务名称(用于追踪)" })),
  agentTeams: Type.Optional(Type.Boolean({ description: "启用 Agent Teams (开发+测试并行)" })),
  permissionMode: optionalStringEnum(["bypassPermissions", "plan", "acceptEdits"]),
  model: Type.Optional(Type.String({ description: "模型覆盖" })),
  timeoutSeconds: Type.Optional(Type.Number({ description: "超时时间(秒)" })),
});

export function createClaudeCodeSpawnTool(): AnyAgentTool {
  return {
    label: "ClaudeCode",
    name: "claude_code_spawn",
    description: "分发开发任务给 Claude Code 执行，支持 Agent Teams 并行开发+测试",
    parameters: ClaudeCodeSpawnToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const task = readStringParam(params, "task", { required: true });
      const workdir = readStringParam(params, "workdir", { required: true });
      const taskName = typeof params.taskName === "string" ? params.taskName.trim() : undefined;
      const agentTeams = params.agentTeams === true;
      const permissionMode =
        typeof params.permissionMode === "string" ? params.permissionMode : "bypassPermissions";
      const model = typeof params.model === "string" ? params.model : undefined;
      const timeoutSeconds =
        typeof params.timeoutSeconds === "number" ? params.timeoutSeconds : 3600;

      // 安全检查：确保 workdir 在允许的范围内
      const isAllowed = ALLOWED_WORKDIR_PREFIXES.some((prefix) => workdir.startsWith(prefix));
      if (!isAllowed) {
        return jsonResult({
          status: "error",
          error: `工作目录不在允许范围内: ${workdir}`,
        });
      }

      // 构建 dispatch.sh 命令
      const cmd = [
        "bash",
        DISPATCH_SCRIPT,
        "-p",
        task,
        "-w",
        workdir,
        "--permission-mode",
        permissionMode,
      ];

      if (taskName) {
        cmd.push("-n", taskName);
      }
      if (agentTeams) {
        cmd.push("--agent-teams");
      }
      if (model) {
        cmd.push("--model", model);
      }

      try {
        const { stdout, stderr } = await execAsync(cmd.join(" "), {
          cwd: workdir,
          timeout: timeoutSeconds * 1000,
        });

        return jsonResult({
          status: "done",
          output: stdout + stderr,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return jsonResult({
          status: "error",
          error: errorMessage,
        });
      }
    },
  };
}
