import { describe, expect, it } from "vitest";
import extension from "../index.ts";

type ToolCallHandler = (event: any, ctx: any) => any;

function loadHandler(): ToolCallHandler {
  let handler: ToolCallHandler | undefined;
  extension({
    on(event: string, callback: ToolCallHandler) {
      if (event === "tool_call") handler = callback;
    },
  } as any);
  if (!handler) throw new Error("tool_call handler was not registered");
  return handler;
}

const context = {
  model: { provider: "openai-codex", id: "gpt-5.6-terra" },
};

describe("Pi tool_call integration", () => {
  it("adds the approved trailers before bash execution", () => {
    const event = { toolName: "bash", input: { command: 'git commit -m "initial release"' } };

    loadHandler()(event, context);

    expect(event.input.command).toContain("Co-authored-by: pi <noreply@pi.dev>");
    expect(event.input.command).toContain("Agent-Model: openai-codex/gpt-5.6-terra");
  });

  it.each([
    'git commit -m "release" && git push',
    'python3 -m json.tool keybindings.json >/dev/null && git -C /tmp/project commit -m "release" && git push',
  ])("blocks a chained commit instead of rewriting it unsafely: %s", (command) => {
    const event = { toolName: "bash", input: { command } };

    const result = loadHandler()(event, context);

    expect(result).toMatchObject({ block: true });
    expect(event.input.command).toBe(command);
  });

  it("does not affect non-bash tool calls", () => {
    const event = { toolName: "read", input: { command: 'git commit -m "ignored"' } };

    const result = loadHandler()(event, context);

    expect(result).toBeUndefined();
    expect(event.input.command).toBe('git commit -m "ignored"');
  });
});
