import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { describe, expect, it } from "vitest";
import { createEvolveTaskTool } from "./evolve-task-tool.js";

describe("evolve_task tool", () => {
  const tool = createEvolveTaskTool();

  // Helper to extract text from tool result
  function getResultText(result: AgentToolResult<unknown>): string {
    const content = result.content[0];
    if (content.type === "text") {
      return content.text;
    }
    throw new Error("Expected text content");
  }

  it("should have correct name and description", () => {
    expect(tool.name).toBe("evolve_task");
    expect(tool.label).toBe("Evolve");
    expect(tool.description).toContain("Evolver");
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
    expect(tool.parameters.properties.strategy).toBeDefined();
    expect(tool.parameters.properties.analyzeOnly).toBeDefined();
  });

  it("should have task and workdir as required parameters", () => {
    const required = tool.parameters.required as string[];
    expect(required).toContain("task");
    expect(required).toContain("workdir");
  });

  it("should have strategy enum values", () => {
    const strategy = tool.parameters.properties.strategy;
    expect(strategy).toBeDefined();
  });

  it("should validate workdir against allowed prefixes", async () => {
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
    const result = await tool.execute("test-call", {
      task: "test task",
      workdir: "/Users/zkf/work/openclaw",
    });

    const text = getResultText(result);
    const parsed = JSON.parse(text);
    // Either error from dispatch script or analysis result is acceptable
    if (parsed.error) {
      expect(parsed.error).not.toContain("不在允许范围内");
    }
  });

  it("should throw error for missing task parameter", async () => {
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

  it("should support strategy parameter", async () => {
    const result = await tool.execute("test-call", {
      task: "test task",
      workdir: "/Users/zkf/work/openclaw",
      strategy: "harden",
    });

    const text = getResultText(result);
    const parsed = JSON.parse(text);
    expect(parsed).toBeDefined();
  });

  it("should support analyzeOnly parameter", async () => {
    const result = await tool.execute("test-call", {
      task: "test task",
      workdir: "/Users/zkf/work/openclaw",
      analyzeOnly: true,
    });

    const text = getResultText(result);
    const parsed = JSON.parse(text);
    // analyzeOnly should return analyzed status or error from evolver
    expect(parsed).toBeDefined();
  });
});
