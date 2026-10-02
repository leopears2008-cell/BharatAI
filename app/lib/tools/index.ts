import { Type, FunctionDeclaration } from "@google/genai";

/**
 * Tools exposed to the model. Only tools that really work are declared.
 * (The previous mock `search_web` was removed: a fake search must not be offered
 * as real. Add it back once a real provider such as Tavily/Brave is wired in.)
 */
export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_current_time",
    description: "Get the current date and time in a specific IANA timezone.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        timezone: { type: Type.STRING, description: "IANA timezone, e.g. 'Asia/Kolkata' or 'UTC'" },
      },
      required: ["timezone"],
    },
  },
  {
    name: "calculator",
    description: "Evaluate an arithmetic expression using + - * / % ^ and parentheses.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        expression: { type: Type.STRING, description: "e.g. '(12.5 + 3) * 4 / 2'" },
      },
      required: ["expression"],
    },
  },
];

/** Safe recursive-descent evaluator (no eval / Function). */
export function evaluateExpression(expr: string): number {
  const s = expr.replace(/\s+/g, "");
  if (!s || s.length > 200 || !/^[0-9+\-*/%^().]+$/.test(s)) throw new Error("Unsupported expression");
  let i = 0;

  const parseExpr = (): number => {
    let v = parseTerm();
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i++];
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const parseTerm = (): number => {
    let v = parseFactor();
    while (s[i] === "*" || s[i] === "/" || s[i] === "%") {
      const op = s[i++];
      const r = parseFactor();
      v = op === "*" ? v * r : op === "/" ? v / r : v % r;
    }
    return v;
  };
  const parseFactor = (): number => {
    if (s[i] === "-") { i++; return -parseFactor(); }
    if (s[i] === "+") { i++; return parseFactor(); }
    const base = parsePrimary();
    if (s[i] === "^") { i++; return Math.pow(base, parseFactor()); }
    return base;
  };
  const parsePrimary = (): number => {
    if (s[i] === "(") {
      i++;
      const v = parseExpr();
      if (s[i] !== ")") throw new Error("Unbalanced parentheses");
      i++;
      return v;
    }
    const m = /^[0-9]*\.?[0-9]+/.exec(s.slice(i));
    if (!m) throw new Error("Expected a number");
    i += m[0].length;
    return parseFloat(m[0]);
  };

  const result = parseExpr();
  if (i !== s.length) throw new Error("Unexpected token");
  if (!Number.isFinite(result)) throw new Error("Result is not a finite number");
  return result;
}

export type ToolOutcome = { ok: true; result: unknown } | { ok: false; error: string };

export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolOutcome> {
  try {
    switch (name) {
      case "get_current_time": {
        const timezone = typeof args.timezone === "string" ? args.timezone : "UTC";
        const time = new Date().toLocaleString("en-US", { timeZone: timezone });
        return { ok: true, result: { time, timezone } };
      }
      case "calculator": {
        if (typeof args.expression !== "string") return { ok: false, error: "expression must be a string" };
        return { ok: true, result: { value: evaluateExpression(args.expression) } };
      }
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Tool execution failed" };
  }
}
