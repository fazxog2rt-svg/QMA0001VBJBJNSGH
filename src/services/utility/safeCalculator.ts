/**
 * Safe arithmetic expression evaluator using the shunting-yard algorithm.
 * Supports + - * / % ^, parentheses, and decimals. No eval / Function — untrusted
 * user input never touches the JS interpreter.
 */

type Token =
  | { type: "number"; value: number }
  | { type: "op"; value: string }
  | { type: "paren"; value: "(" | ")" };

const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 3 };
const RIGHT_ASSOCIATIVE = new Set(["^"]);

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i]!;

    if (char === " ") {
      i += 1;
      continue;
    }

    if (char >= "0" && char <= "9") {
      let numberStr = "";
      while (i < input.length && ((input[i]! >= "0" && input[i]! <= "9") || input[i] === ".")) {
        numberStr += input[i];
        i += 1;
      }
      tokens.push({ type: "number", value: Number(numberStr) });
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      i += 1;
      continue;
    }

    if (char in PRECEDENCE) {
      tokens.push({ type: "op", value: char });
      i += 1;
      continue;
    }

    throw new Error(`Karakter tidak valid: "${char}"`);
  }

  return tokens;
}

function toRpn(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const operators: Token[] = [];

  for (const token of tokens) {
    if (token.type === "number") {
      output.push(token);
    } else if (token.type === "op") {
      while (operators.length > 0) {
        const top = operators[operators.length - 1]!;
        if (top.type !== "op") break;
        const higher = PRECEDENCE[top.value]! > PRECEDENCE[token.value]!;
        const equalLeft =
          PRECEDENCE[top.value]! === PRECEDENCE[token.value]! &&
          !RIGHT_ASSOCIATIVE.has(token.value);
        if (higher || equalLeft) {
          output.push(operators.pop()!);
        } else {
          break;
        }
      }
      operators.push(token);
    } else if (token.value === "(") {
      operators.push(token);
    } else {
      let foundParen = false;
      while (operators.length > 0) {
        const top = operators.pop()!;
        if (top.type === "paren" && top.value === "(") {
          foundParen = true;
          break;
        }
        output.push(top);
      }
      if (!foundParen) throw new Error("Tanda kurung tidak seimbang.");
    }
  }

  while (operators.length > 0) {
    const top = operators.pop()!;
    if (top.type === "paren") throw new Error("Tanda kurung tidak seimbang.");
    output.push(top);
  }

  return output;
}

function evaluateRpn(rpn: Token[]): number {
  const stack: number[] = [];

  for (const token of rpn) {
    if (token.type === "number") {
      stack.push(token.value);
      continue;
    }

    if (token.type !== "op") continue;

    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) throw new Error("Ekspresi tidak valid.");

    switch (token.value) {
      case "+":
        stack.push(a + b);
        break;
      case "-":
        stack.push(a - b);
        break;
      case "*":
        stack.push(a * b);
        break;
      case "/":
        if (b === 0) throw new Error("Pembagian dengan nol.");
        stack.push(a / b);
        break;
      case "%":
        stack.push(a % b);
        break;
      case "^":
        stack.push(a ** b);
        break;
    }
  }

  if (stack.length !== 1) throw new Error("Ekspresi tidak valid.");
  return stack[0]!;
}

export function evaluateExpression(input: string): number {
  const result = evaluateRpn(toRpn(tokenize(input)));
  if (!Number.isFinite(result)) throw new Error("Hasil bukan angka valid.");
  return result;
}
