import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { analyzeCommitCommand, appendAttribution } from "./lib/commit-command.ts";

const CO_AUTHOR = "pi <noreply@pi.dev>";

function modelIdentifier(model: { provider: string; id: string } | undefined): string {
  if (!model) return "unknown";
  return `${model.provider}/${model.id}`.replace(/[\x00-\x1f\x7f]/g, "?").trim() || "unknown";
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", (event, ctx) => {
    if (!isToolCallEventType("bash", event)) return;

    const analysis = analyzeCommitCommand(event.input.command);
    if (analysis.kind === "not-git-commit") return;

    if (analysis.kind === "unsupported") {
      return {
        block: true,
        reason:
          "Pi attribution supports one simple git commit command with -m or --message. " +
          "Do not chain, redirect, pipe, or use shell substitution; run git commit -m \"...\" directly.",
      };
    }

    if (analysis.kind === "missing-message") {
      return {
        block: true,
        reason:
          "Use git commit -m \"...\" so Pi can attach attribution trailers without opening an editor.",
      };
    }

    if (analysis.kind === "complete-attribution") return;

    if (analysis.kind === "partial-attribution") {
      return {
        block: true,
        reason:
          "The commit message contains only part of Pi's attribution. Include both trailers or remove them and retry.",
      };
    }

    event.input.command = appendAttribution(event.input.command, CO_AUTHOR, modelIdentifier(ctx.model));
  });
}
