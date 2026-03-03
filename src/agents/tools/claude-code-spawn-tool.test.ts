import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { describe, expect, it } from "vitest";
import { createClaudeCodeSpawnTool } from "./claude-code-spawn-tool.js";

describe("claude_code_spawn tool", () => {
  const tool = createClaudeCodeSpawnTool();

  // Helper to extract text from tool result
  function getResultText(result: AgentToolResult<unknown>): string {
    const content = result.content[0];
    if (content.type === "text") {
      return content.text;
    }
    throw new Error("Expected text content");
  }

  it("should have correct name and description", () => {
    expect(tool.name).toBe("claude_code_spawn");
    expect(tool.label).toBe("ClaudeCode");
    expect(tool.description).toContain("Claude Code");
  });

  it("should have valid parameters schema", () => {
    expect(tool.parameters).toBeDefined();
    expect(tool.parameters.type).toBe("object");
    expect(tool.parameters.properties).toBeDefined();
    expect(tool.parameters.properties.task).toBeDefined();
    expect(tool.parameters.properties.workdir).toBeDefined();
    expect(tool.parameters.properties.taskName).toBeDefined();
    expect(tool.parameters.properties.agentTeams).toBeDefined();
    expect(tool.parameters.properties.permissionMode).toBeDefined();
    expect(tool.parameters.properties.model).toBeDefined();
    expect(tool.parameters.properties.timeoutSeconds).toBeDefined();
  });

  it("should have task and workdir as required parameters", () => {
    const required = tool.parameters.required as string[];
    expect(required).toContain("task");
    expect(required).toContain("workdir");
  });

  it("should have permissionMode property defined", () => {
    const permissionMode = tool.parameters.properties.permissionMode;
    expect(permissionMode).toBeDefined();
  });

  it("should validate workdir against allowed prefixes", async () => {
    // Test invalid workdir - should be rejected at execute time
    const result = await tool.execute("test-call", {
      task: "test task",
      workdir: "/tmp/invalid-path",
    });

    const text = getResultText(result);
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe("error");
    expect(parsed.error).toContain("不在允许范围内");
  });

  it("should accept valid workdir in /Users/zkf/work", async () => {
    // Valid workdir - should attempt to execute (will fail due to mock but validates prefix)
    const result = await tool.execute("test-call", {
      task: "test task",
      workdir: "/Users/zkf/work/openclaw",
    });

    const text = getResultText(result);
    const parsed = JSON.parse(text);
    // Either done or error from dispatch script is acceptable
    // But if it says "不在允许范围内", it's a validation error
    if (parsed.error) {
      expect(parsed.error).not.toContain("不在允许范围内");
    }
  });

  it("should throw error for missing task parameter", async () => {
    // ToolInputError should be thrown for missing required params
    await expect(
      tool.execute("test-call", {
        workdir: "/Users/zkf/work/openclaw",
      }),
    ).rejects.toThrow("task required");
  });

  it("should throw error for missing workdir parameter", async () => {
    await expect(
      tool.execute("test-call", {
        task: "test task",
      }),
    ).rejects.toThrow("workdir required");
  });
});
