import type { ExpressionResult } from "./types";

const UNIT_PATTERN = /(원|명|개|회|월|일|시간|식|권|부|대|건|세트|학급|차시|주|년)/g;

class ArithmeticParser {
  private index = 0;
  constructor(private readonly tokens: string[]) {}

  parse(): number {
    const value = this.expression();
    if (this.index !== this.tokens.length) throw new Error("unexpected token");
    return value;
  }

  private expression(): number {
    let value = this.term();
    while (this.peek() === "+" || this.peek() === "-") {
      const operator = this.take();
      const right = this.term();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  private term(): number {
    let value = this.factor();
    while (this.peek() === "*" || this.peek() === "/") {
      const operator = this.take();
      const right = this.factor();
      if (operator === "/" && right === 0) throw new Error("division by zero");
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  }

  private factor(): number {
    if (this.peek() === "+") { this.take(); return this.factor(); }
    if (this.peek() === "-") { this.take(); return -this.factor(); }
    if (this.peek() === "(") {
      this.take();
      const value = this.expression();
      if (this.take() !== ")") throw new Error("unbalanced parentheses");
      return value;
    }
    const token = this.take();
    if (!token || !/^\d+(?:\.\d+)?$/.test(token)) throw new Error("number expected");
    return Number(token);
  }

  private peek(): string | undefined { return this.tokens[this.index]; }
  private take(): string | undefined { return this.tokens[this.index++]; }
}

export function calculateBudgetExpression(expression: string): ExpressionResult {
  if (!expression.trim()) return { ok: false, reason: "산출식이 비어 있습니다." };

  const normalized = expression
    .replace(/,/g, "")
    .replace(/[×✕]/g, "*")
    .replace(/([\d)])\s*[xX]\s*(?=[\d(])/g, "$1*")
    .replace(UNIT_PATTERN, "")
    .replace(/\s+/g, "");

  if (!normalized || /[^\d.+\-*/()]/.test(normalized)) {
    return { ok: false, reason: "지원하지 않는 산출식입니다." };
  }

  const tokens = normalized.match(/\d+(?:\.\d+)?|[()+\-*/]/g) ?? [];
  if (tokens.join("") !== normalized) return { ok: false, reason: "지원하지 않는 산출식입니다." };

  try {
    const value = new ArithmeticParser(tokens).parse();
    if (!Number.isFinite(value)) throw new Error("non finite");
    return { ok: true, value: Math.round(value) };
  } catch {
    return { ok: false, reason: "지원하지 않는 산출식입니다." };
  }
}
