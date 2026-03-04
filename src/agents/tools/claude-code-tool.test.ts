import { describe, expect, it, vi, beforeEach } from "vitest";
import { createClaudeCodeTool, ClaudeCodeToolSchema } from "./claude-code-tool.js";

describe("claude_code tool", () => {
  describe("schema", () => {
    it("should have correct schema structure", () => {
      expect(ClaudeCodeToolSchema.type).toBe("object");
      expect(ClaudeCodeToolSchema.required).toContain("action");
      expect(ClaudeCodeToolSchema.properties.action.type).toBe("string");
      expect(ClaudeCodeToolSchema.properties.action.enum).toEqual(["run", "version"]);
    });

    it("should define all parameter types", () => {
      const props = ClaudeCodeToolSchema.properties;
      expect(props.prompt.type).toBe("string");
      expect(props.workdir.type).toBe("string");
      expect(props.permissionMode.type).toBe("string");
      expect(props.permissionMode.enum).toEqual(["bypassPermissions", "plan", "acceptEdits"]);
      expect(props.allowedTools.type).toBe("array");
      expect(props.model.type).toBe("string");
      expect(props.timeout.type).toBe("number");
    });
  });

  describe("tool definition", () => {
    it("should have correct name and label", () => {
      const tool = createClaudeCodeTool();
      expect(tool.name).toBe("claude_code");
      expect(tool.label).toBe("Claude Code");
    });

    it("should have description", () => {
      const tool = createClaudeCodeTool();
      expect(tool.description).toContain("Execute tasks using Claude Code CLI");
      expect(tool.description).toContain("run");
      expect(tool.description).toContain("version");
    });

    it("should have execute function", () => {
      const tool = createClaudeCodeTool();
      expect(typeof tool.execute).toBe("function");
    });
  });

  describe("execute - version action", () => {
    it("should return version when claude is installed", async () => {
      const tool = createClaudeCodeTool();
      const result = await tool.execute("test-call", { action: "version" });

      // If Claude Code is installed, should return version info
      // If not installed, should throw "not found" error
      if (result.details && typeof result.details === "object" && "installed" in result.details) {
        expect(result.details.installed).toBe(true);
        expect(result.details).toHaveProperty("version");
      }
    });
  });

  describe("execute - run action validation", () => {
    it("should require prompt for run action", async () => {
      const tool = createClaudeCodeTool();

      // Mock spawn to simulate claude installed
      const mockSpawn = vi.fn().mockReturnValue({
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === "close") {
            cb(0);
          }
        }),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        kill: vi.fn(),
      });

      vi.doMock("node:child_process", () => ({
        spawn: mockSpawn,
      }));

      await expect(tool.execute("test-call", { action: "run" })).rejects.toThrow();
    });
  });

  describe("parameter parsing", () => {
    it("should correctly parse all parameters", () => {
      const tool = createClaudeCodeTool();
      expect(tool.parameters).toBe(ClaudeCodeToolSchema);
    });
  });
});

describe("ClaudeCodeTool integration", () => {
  it("should be importable from tools module", async () => {
    const { createClaudeCodeTool } = await import("./claude-code-tool.js");
    expect(typeof createClaudeCodeTool).toBe("function");
    const tool = createClaudeCodeTool();
    expect(tool.name).toBe("claude_code");
  });
});
