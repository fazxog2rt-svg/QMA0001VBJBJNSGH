import { describe, expect, it } from "vitest";
import { evaluateExpression } from "../src/services/utility/safeCalculator";

describe("safeCalculator", () => {
  it("evaluates basic arithmetic", () => {
    expect(evaluateExpression("2 + 3")).toBe(5);
    expect(evaluateExpression("10 - 4")).toBe(6);
    expect(evaluateExpression("6 * 7")).toBe(42);
    expect(evaluateExpression("20 / 4")).toBe(5);
  });

  it("respects operator precedence and parentheses", () => {
    expect(evaluateExpression("2 + 3 * 4")).toBe(14);
    expect(evaluateExpression("(2 + 3) * 4")).toBe(20);
    expect(evaluateExpression("2 ^ 3 ^ 2")).toBe(512); // right-associative
  });

  it("handles modulo and decimals", () => {
    expect(evaluateExpression("10 % 3")).toBe(1);
    expect(evaluateExpression("1.5 + 2.5")).toBe(4);
  });

  it("throws on division by zero", () => {
    expect(() => evaluateExpression("5 / 0")).toThrow();
  });

  it("throws on invalid characters (no code execution)", () => {
    expect(() => evaluateExpression("process.exit(1)")).toThrow();
    expect(() => evaluateExpression("alert('x')")).toThrow();
  });

  it("throws on unbalanced parentheses", () => {
    expect(() => evaluateExpression("(2 + 3")).toThrow();
    expect(() => evaluateExpression("2 + 3)")).toThrow();
  });
});
