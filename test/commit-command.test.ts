import { describe, expect, it } from "vitest";
import { analyzeCommitCommand, appendAttribution } from "../lib/commit-command.ts";

const subject = 'git commit -m "add attribution extension"';

describe("analyzeCommitCommand", () => {
  it.each([
    [subject, "ready"],
    ['git -C /tmp/project commit --message="message" --no-verify', "ready"],
    ['git commit -am "stage and commit"', "ready"],
    ["git status", "not-git-commit"],
    ["echo git commit -m message", "not-git-commit"],
    ["git commit", "missing-message"],
    ["git commit --amend", "missing-message"],
    ['git commit -m "message" && git push', "unsupported"],
    [
      'python3 -m json.tool keybindings.json >/dev/null && git -C /tmp/project commit -m "message" && git push',
      "unsupported",
    ],
    ['git commit -m "message" > /tmp/output', "unsupported"],
    ['git commit -m "$(date)"', "unsupported"],
    ["git commit -m 'unterminated", "unsupported"],
  ] as const)("classifies %s as %s", (command, kind) => {
    expect(analyzeCommitCommand(command).kind).toBe(kind);
  });

  it("does not add duplicate complete attribution", () => {
    const command = `${subject} -m $'Co-authored-by: pi <noreply@pi.dev>\nAgent-Model: openai-codex/gpt-5.6-terra'`;
    expect(analyzeCommitCommand(command).kind).toBe("complete-attribution");
  });

  it("blocks partial attribution to avoid duplicate trailers", () => {
    const command = `${subject} -m 'Agent-Model: openai-codex/gpt-5.6-terra'`;
    expect(analyzeCommitCommand(command).kind).toBe("partial-attribution");
  });
});

describe("appendAttribution", () => {
  it("adds exactly the approved trailers in one paragraph", () => {
    expect(appendAttribution(subject, "pi <noreply@pi.dev>", "openai-codex/gpt-5.6-terra")).toBe(
      `${subject} -m "" -m $'Co-authored-by: pi <noreply@pi.dev>\nAgent-Model: openai-codex/gpt-5.6-terra'`,
    );
  });

  it("escapes apostrophes and backslashes in a model identifier", () => {
    const command = appendAttribution(subject, "pi <noreply@pi.dev>", "provider/model'\\name");
    expect(command).toContain("provider/model\\'\\\\name");
  });
});
