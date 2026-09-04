export type CommitCommandAnalysis =
  | { kind: "not-git-commit" }
  | { kind: "unsupported" }
  | { kind: "missing-message" }
  | { kind: "complete-attribution" }
  | { kind: "partial-attribution" }
  | { kind: "ready" };

type TokenizeResult = { tokens: string[] } | { unsupported: true };

const UNSUPPORTED_SHELL = new Set([";", "|", "&", "<", ">", "(", ")", "#"]);

/**
 * Tokenize one simple shell command. Shell control operators, comments, command
 * substitution, and unterminated quotes are rejected rather than rewritten.
 */
function tokenizeSimpleCommand(command: string): TokenizeResult {
  const tokens: string[] = [];
  let token = "";
  let quote: "single" | "double" | undefined;

  const push = () => {
    if (token) tokens.push(token);
    token = "";
  };

  for (let index = 0; index < command.length; index++) {
    const char = command[index]!;

    if (quote === "single") {
      if (char === "'") quote = undefined;
      else token += char;
      continue;
    }

    if (quote === "double") {
      if (char === '"') {
        quote = undefined;
      } else if (char === "\\") {
        const next = command[++index];
        if (next === undefined) return { unsupported: true };
        token += next;
      } else if (char === "`" || (char === "$" && command[index + 1] === "(")) {
        return { unsupported: true };
      } else {
        token += char;
      }
      continue;
    }

    if (char === "'") {
      quote = "single";
    } else if (char === '"') {
      quote = "double";
    } else if (/\s/.test(char)) {
      push();
    } else if (char === "\\") {
      const next = command[++index];
      if (next === undefined) return { unsupported: true };
      token += next;
    } else if (
      UNSUPPORTED_SHELL.has(char) ||
      char === "`" ||
      (char === "$" && command[index + 1] === "(")
    ) {
      return { unsupported: true };
    } else {
      token += char;
    }
  }

  if (quote) return { unsupported: true };
  push();
  return { tokens };
}

function hasMessageFlag(tokens: string[], commitIndex: number): boolean {
  for (let index = commitIndex + 1; index < tokens.length; index++) {
    const token = tokens[index]!;
    if (token === "-m" || token === "--message" || token.startsWith("--message=")) return true;
    if (/^-[A-Za-z]*m[A-Za-z]*$/.test(token)) return true;
  }
  return false;
}

function attributionState(command: string): "none" | "complete" | "partial" {
  const coAuthor = /co-authored-by:\s*pi\s*<noreply@pi\.dev>/i.test(command);
  const agentModel = /agent-model:\s*\S+/i.test(command);
  if (coAuthor && agentModel) return "complete";
  if (coAuthor || agentModel) return "partial";
  return "none";
}

/** Analyze a direct, simple `git … commit` command without executing it. */
export function analyzeCommitCommand(command: string): CommitCommandAnalysis {
  const result = tokenizeSimpleCommand(command);
  // Once shell syntax is found, only decide whether to reject. Match a direct
  // `git … commit` segment after a shell control operator too, so a safe
  // preflight command cannot make a later commit silently bypass attribution.
  const looksLikeGitCommit = /(?:^|[;&|]\s*)git(?:\s+(?![;&|])\S+)*\s+commit(?:\s|$)/.test(command);

  if ("unsupported" in result) {
    return looksLikeGitCommit ? { kind: "unsupported" } : { kind: "not-git-commit" };
  }

  const { tokens } = result;
  if (tokens[0] !== "git") return { kind: "not-git-commit" };

  const commitIndex = tokens.indexOf("commit", 1);
  if (commitIndex === -1) return { kind: "not-git-commit" };
  if (!hasMessageFlag(tokens, commitIndex)) return { kind: "missing-message" };

  switch (attributionState(command)) {
    case "complete": return { kind: "complete-attribution" };
    case "partial": return { kind: "partial-attribution" };
    default: return { kind: "ready" };
  }
}

function escapeAnsiCString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Append one Git trailer paragraph to a command accepted by analyzeCommitCommand. */
export function appendAttribution(command: string, coAuthor: string, agentModel: string): string {
  const trailers = [
    `Co-authored-by: ${coAuthor}`,
    `Agent-Model: ${agentModel}`,
  ].join("\n");

  return `${command.trimEnd()} -m "" -m $'${escapeAnsiCString(trailers)}'`;
}
