import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Type } from "@sinclair/typebox";
import { optionalStringEnum } from "../schema/typebox.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam } from "./common.js";

const execAsync = promisify(exec);

// dispatch.sh 路径
const DISPATCH_SCRIPT =
  process.env.OPENCLAW_CLAUDE_CODE_DISPATCH_SCRIPT ||
  "/Users/zkf/work/claude-code-dispatch/scripts/dispatch.sh";

// evolver 路径
const EVOLVER_PATH = process.env.OPENCLAW_EVOLVER_PATH || "/Users/zkf/work/evolver";

// 允许的工作目录前缀
const ALLOWED_WORKDIR_PREFIXES = ["/Users/zkf/work"];

// 任务完整性检查项
const TASK_COMPLETENESS_CHECKS = [
  { key: "test", keywords: ["测试", "test", "spec", "用例"], required: false },
  { key: "docs", keywords: ["文档", "doc", "readme", "注释"], required: false },
  { key: "error_handling", keywords: ["错误处理", "error handling", "exception"], required: false },
  { key: "types", keywords: ["类型", "type", "typing", "interface"], required: false },
];

const EvolveTaskToolSchema = Type.Object({
  task: Type.String({ description: "开发任务描述" }),
  workdir: Type.String({ description: "工作目录路径" }),
  taskName: Type.Optional(Type.String({ description: "任务名称(用于追踪)" })),
  agentTeams: Type.Optional(Type.Boolean({ description: "启用 Agent Teams (开发+测试并行)" })),
  permissionMode: optionalStringEnum(["bypassPermissions", "plan", "acceptEdits"]),
  model: Type.Optional(Type.String({ description: "模型覆盖" })),
  timeoutSeconds: Type.Optional(Type.Number({ description: "超时时间(秒)" })),
  strategy: optionalStringEnum(["balanced", "innovate", "harden", "repair-only"]),
  analyzeOnly: Type.Optional(Type.Boolean({ description: "仅分析任务，不执行" })),
});

interface EvolverResult {
  strategy?: string;
  genes?: string[];
  capsules?: string[];
  prompt?: string;
  signals?: Array<{ type: string; description: string }>;
  suggestions?: string[];
}

interface TaskAnalysis {
  isComplete: boolean;
  missing: string[];
  suggestions: string[];
  evolverResult?: EvolverResult;
}

/**
 * 调用 evolver 分析任务
 */
async function callEvolver(args: { task: string; strategy?: string }): Promise<EvolverResult> {
  const strategy = args.strategy || "balanced";
  const task = args.task;

  try {
    // 调用 evolver run 命令
    const cmd = ["node", "index.js", "run", "--strategy", strategy, "--task", task];

    const { stdout, stderr: _stderr } = await execAsync(cmd.join(" "), {
      cwd: EVOLVER_PATH,
      timeout: 60000, // 60秒超时
    });

    // 解析 evolver 输出
    // evolver 输出格式为 JSON 或文本，尝试解析
    try {
      // 尝试找到 JSON 输出
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // 解析失败，返回原始输出作为 prompt
      return {
        strategy,
        prompt: stdout,
        genes: [],
        capsules: [],
      };
    }

    return {
      strategy,
      prompt: stdout,
      genes: [],
      capsules: [],
    };
  } catch (error: unknown) {
    // evolver 调用失败，返回默认结果
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Evolver] Error: ${errorMessage}`);
    return {
      strategy,
      prompt: task,
      genes: [],
      capsules: [],
      signals: [{ type: "error", description: errorMessage }],
    };
  }
}

/**
 * 分析任务完整性
 */
function analyzeTaskCompleteness(task: string): TaskAnalysis {
  const taskLower = task.toLowerCase();
  const missing: string[] = [];
  const suggestions: string[] = [];

  for (const check of TASK_COMPLETENESS_CHECKS) {
    const hasKeyword = check.keywords.some((kw) => taskLower.includes(kw));
    if (!hasKeyword && check.required) {
      missing.push(check.key);
      suggestions.push(`建议添加 ${check.key} 相关内容`);
    }
  }

  // 生成完善建议
  if (!taskLower.includes("测试") && !taskLower.includes("test")) {
    suggestions.push("建议包含单元测试或 E2E 测试");
  }
  if (!taskLower.includes("文档") && !taskLower.includes("doc")) {
    suggestions.push("建议包含 README 或代码注释");
  }

  return {
    isComplete: missing.length === 0,
    missing,
    suggestions,
  };
}

/**
 * 增强任务描述
 */
function enhanceTaskDescription(originalTask: string, analysis: TaskAnalysis): string {
  let enhanced = originalTask;

  // 添加完整性分析结果
  if (!analysis.isComplete) {
    enhanced += `\n\n## 任务分析\n`;
    enhanced += `检测到以下可能缺失的内容:\n`;
    for (const suggestion of analysis.suggestions) {
      enhanced += `- ${suggestion}\n`;
    }
  }

  // 添加 evolver 分析结果
  if (analysis.evolverResult) {
    const { strategy, genes, capsules, prompt } = analysis.evolverResult;

    if (strategy) {
      enhanced += `\n## 演化策略\n选择策略: ${strategy}`;
    }

    if (genes && genes.length > 0) {
      enhanced += `\n## 推荐使用的 Genes\n${genes.join(", ")}`;
    }

    if (capsules && capsules.length > 0) {
      enhanced += `\n## 推荐使用的 Capsules\n${capsules.join(", ")}`;
    }

    // 如果 evolver 有额外的 prompt 内容，添加进去
    if (prompt && prompt !== originalTask) {
      enhanced += `\n## 扩展要求\n${prompt}`;
    }
  }

  return enhanced;
}

export function createEvolveTaskTool(): AnyAgentTool {
  return {
    label: "Evolve",
    name: "evolve_task",
    description:
      "智能任务分析与执行：先用 Evolver 分析任务完整性和演化策略，然后调用 Claude Code 执行。支持任务分解、修复建议。",
    parameters: EvolveTaskToolSchema,
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
      const strategy = typeof params.strategy === "string" ? params.strategy : "balanced";
      const analyzeOnly = params.analyzeOnly === true;

      // 安全检查：确保 workdir 在允许的范围内
      const isAllowed = ALLOWED_WORKDIR_PREFIXES.some((prefix) => workdir.startsWith(prefix));
      if (!isAllowed) {
        return jsonResult({
          status: "error",
          error: `工作目录不在允许范围内: ${workdir}`,
        });
      }

      // 阶段1+2: 任务分析
      const analysis: TaskAnalysis = {
        isComplete: true,
        missing: [],
        suggestions: [],
      };

      // 1. 任务完整性分析
      const completeness = analyzeTaskCompleteness(task);
      analysis.isComplete = completeness.isComplete;
      analysis.missing = completeness.missing;
      analysis.suggestions = completeness.suggestions;

      // 2. 调用 Evolver 进行策略分析
      const evolverResult = await callEvolver({
        task,
        strategy,
      });
      analysis.evolverResult = evolverResult;

      // 如果只分析不执行，返回分析结果
      if (analyzeOnly) {
        return jsonResult({
          status: "analyzed",
          task: task,
          completeness: {
            isComplete: analysis.isComplete,
            missing: analysis.missing,
            suggestions: analysis.suggestions,
          },
          evolver: {
            strategy: evolverResult.strategy,
            genes: evolverResult.genes,
            capsules: evolverResult.capsules,
          },
          enhancedTask: enhanceTaskDescription(task, analysis),
        });
      }

      // 阶段1+2: 增强任务描述并执行
      const enhancedTask = enhanceTaskDescription(task, analysis);

      // 构建 dispatch.sh 命令
      const cmd = [
        "bash",
        DISPATCH_SCRIPT,
        "-p",
        enhancedTask,
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
        const { stdout, stderr: _stderr } = await execAsync(cmd.join(" "), {
          cwd: workdir,
          timeout: timeoutSeconds * 1000,
        });

        // 阶段3: 结果分析
        const output = stdout + stderr;
        let repairSuggestions: string[] = [];

        // 检查是否有错误指示
        const hasError =
          output.toLowerCase().includes("error") || output.toLowerCase().includes("failed");

        if (hasError) {
          // 调用 evolver 进行修复分析
          const repairResult = await callEvolver({
            task: `修复以下错误:\n${output}`,
            strategy: "repair-only",
          });
          repairSuggestions = repairResult.suggestions || [];
        }

        return jsonResult({
          status: "done",
          task: taskName || "unnamed",
          analysis: {
            completeness: {
              isComplete: analysis.isComplete,
              missing: analysis.missing,
            },
            evolver: {
              strategy: evolverResult.strategy,
              genes: evolverResult.genes,
              capsules: evolverResult.capsules,
            },
          },
          execution: {
            output: output.slice(-5000), // 保留最后5000字符
          },
          repair: hasError
            ? {
                needsRepair: true,
                suggestions: repairSuggestions,
              }
            : { needsRepair: false },
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // 阶段3: 错误分析
        const repairResult = await callEvolver({
          task: `修复以下错误: ${errorMessage}`,
          strategy: "repair-only",
        });

        return jsonResult({
          status: "error",
          error: errorMessage,
          analysis: {
            completeness: {
              isComplete: analysis.isComplete,
              missing: analysis.missing,
            },
            evolver: {
              strategy: evolverResult.strategy,
              genes: evolverResult.genes,
            },
          },
          repair: {
            needsRepair: true,
            suggestions: repairResult.suggestions || ["请检查错误信息并手动修复"],
          },
        });
      }
    },
  };
}
