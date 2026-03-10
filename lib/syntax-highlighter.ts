/**
 * Lightweight syntax highlighter for JavaScript/TypeScript.
 * Tokenizes source into types for highlighting (no external deps).
 */

export type TokenType =
  | "keyword"
  | "string"
  | "template"
  | "comment"
  | "block-comment"
  | "number"
  | "regex"
  | "operator"
  | "identifier"
  | "punctuation"
  | "type"
  | "default";

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

const JS_KEYWORDS = new Set([
  "await", "break", "case", "catch", "class", "const", "continue", "debugger",
  "default", "delete", "do", "else", "export", "extends", "finally", "for",
  "function", "if", "import", "in", "instanceof", "let", "new", "return",
  "super", "switch", "this", "throw", "try", "typeof", "var", "void",
  "while", "with", "yield", "async", "of", "get", "set", "static",
]);

const TS_TYPE_KEYWORDS = new Set([
  "string", "number", "boolean", "symbol", "bigint", "undefined", "null",
  "any", "unknown", "never", "void", "object", "type", "interface", "enum",
  "implements", "declare", "namespace", "module", "as", "is", "keyof",
  "readonly", "abstract", "override", "satisfies",
]);

const PUNCTUATION = new Set([
  ";", ",", ".", "(", ")", "[", "]", "{", "}", "?", ":", "=>",
]);

function isLetterOrUnderscore(ch: string): boolean {
  return /[a-zA-Z_]/.test(ch);
}

function isDigit(ch: string): boolean {
  return /[0-9]/.test(ch);
}

function isIdentifierPart(ch: string): boolean {
  return /[a-zA-Z0-9_]/.test(ch);
}

function isWhitespace(ch: string): boolean {
  return /[\s\n\r]/.test(ch);
}

/**
 * Tokenize JS/TS source into an array of tokens for syntax highlighting.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = source.length;

  while (i < n) {
    const start = i;
    const ch = source[i];

    // Line comment
    if (ch === "/" && source[i + 1] === "/") {
      let value = "//";
      i += 2;
      while (i < n && source[i] !== "\n") {
        value += source[i];
        i++;
      }
      tokens.push({ type: "comment", value, start, end: i });
      continue;
    }

    // Block comment
    if (ch === "/" && source[i + 1] === "*") {
      let value = "/*";
      i += 2;
      while (i < n - 1 && (source[i] !== "*" || source[i + 1] !== "/")) {
        value += source[i];
        i++;
      }
      if (i < n - 1) {
        value += "*/";
        i += 2;
      } else {
        while (i < n) {
          value += source[i];
          i++;
        }
      }
      tokens.push({ type: "block-comment", value, start, end: i });
      continue;
    }

    // Template literal (backticks)
    if (ch === "`") {
      let value = "`";
      i++;
      while (i < n) {
        const c = source[i];
        if (c === "\\") {
          value += c;
          i++;
          if (i < n) {
            value += source[i];
            i++;
          }
          continue;
        }
        if (c === "`") {
          value += c;
          i++;
          break;
        }
        if (c === "$" && source[i + 1] === "{") {
          value += "${";
          i += 2;
          break; // exit to parse expression; we'll treat nested templates simply
        }
        value += c;
        i++;
      }
      tokens.push({ type: "template", value, start, end: i });
      continue;
    }

    // Double-quoted string
    if (ch === '"') {
      let value = '"';
      i++;
      while (i < n) {
        const c = source[i];
        if (c === "\\") {
          value += c;
          i++;
          if (i < n) {
            value += source[i];
            i++;
          }
          continue;
        }
        if (c === '"') {
          value += c;
          i++;
          break;
        }
        value += c;
        i++;
      }
      tokens.push({ type: "string", value, start, end: i });
      continue;
    }

    // Single-quoted string
    if (ch === "'") {
      let value = "'";
      i++;
      while (i < n) {
        const c = source[i];
        if (c === "\\") {
          value += c;
          i++;
          if (i < n) {
            value += source[i];
            i++;
          }
          continue;
        }
        if (c === "'") {
          value += c;
          i++;
          break;
        }
        value += c;
        i++;
      }
      tokens.push({ type: "string", value, start, end: i });
      continue;
    }

    // Regex (simplified: / ... / or / ... /g etc after certain tokens)
    const prevToken = tokens[tokens.length - 1];
    const canBeRegex =
      !prevToken ||
      prevToken.type === "punctuation" ||
      prevToken.type === "operator" ||
      prevToken.value === "return" ||
      prevToken.value === "case" ||
      prevToken.value === "(" ||
      prevToken.value === "=" ||
      prevToken.value === "," ||
      prevToken.value === ";" ||
      prevToken.value === "?" ||
      prevToken.value === ":";

    if (
      ch === "/" &&
      canBeRegex &&
      i + 1 < n &&
      source[i + 1] !== "/" &&
      source[i + 1] !== "*"
    ) {
      let value = "/";
      i++;
      let escaped = false;
      while (i < n) {
        const c = source[i];
        if (escaped) {
          value += c;
          i++;
          escaped = false;
          continue;
        }
        if (c === "\\") {
          value += c;
          i++;
          escaped = true;
          continue;
        }
        if (c === "/") {
          value += c;
          i++;
          while (i < n && /[gimsuy]/.test(source[i])) {
            value += source[i];
            i++;
          }
          break;
        }
        if (c === "\n") break;
        value += c;
        i++;
      }
      tokens.push({ type: "regex", value, start, end: i });
      continue;
    }

    // Numbers (hex, binary, octal, decimal)
    if (isDigit(ch) || (ch === "." && isDigit(source[i + 1]))) {
      let value = "";
      if (ch === "0" && (source[i + 1] === "x" || source[i + 1] === "X")) {
        value = source.slice(i, i + 2);
        i += 2;
        while (i < n && /[0-9a-fA-F]/.test(source[i])) {
          value += source[i];
          i++;
        }
      } else if (ch === "0" && (source[i + 1] === "b" || source[i + 1] === "B")) {
        value = source.slice(i, i + 2);
        i += 2;
        while (i < n && /[01]/.test(source[i])) {
          value += source[i];
          i++;
        }
      } else if (ch === "0" && (source[i + 1] === "o" || source[i + 1] === "O")) {
        value = source.slice(i, i + 2);
        i += 2;
        while (i < n && /[0-7]/.test(source[i])) {
          value += source[i];
          i++;
        }
      } else {
        while (i < n && isDigit(source[i])) {
          value += source[i];
          i++;
        }
        if (i < n && source[i] === ".") {
          value += source[i];
          i++;
          while (i < n && isDigit(source[i])) {
            value += source[i];
            i++;
          }
        }
        if (i < n && (source[i] === "e" || source[i] === "E")) {
          value += source[i];
          i++;
          if (i < n && (source[i] === "+" || source[i] === "-")) {
            value += source[i];
            i++;
          }
          while (i < n && isDigit(source[i])) {
            value += source[i];
            i++;
          }
        }
      }
      tokens.push({ type: "number", value, start, end: i });
      continue;
    }

    // Identifiers and keywords
    if (isLetterOrUnderscore(ch)) {
      let value = "";
      while (i < n && isIdentifierPart(source[i])) {
        value += source[i];
        i++;
      }
      const type = JS_KEYWORDS.has(value)
        ? "keyword"
        : TS_TYPE_KEYWORDS.has(value)
          ? "type"
          : "identifier";
      tokens.push({ type, value, start, end: i });
      continue;
    }

    // Multi-char operators / punctuation
    const two = source.slice(i, i + 2);
    if (
      two === "==" ||
      two === "===" ||
      two === "!=" ||
      two === "!==" ||
      two === "<=" ||
      two === ">=" ||
      two === "<<" ||
      two === ">>" ||
      two === ">>>" ||
      two === "++" ||
      two === "--" ||
      two === "**" ||
      two === "&&" ||
      two === "||" ||
      two === "??" ||
      two === "+=" ||
      two === "-=" ||
      two === "*=" ||
      two === "/=" ||
      two === "%=" ||
      two === "=>" ||
      two === "..."
    ) {
      tokens.push({ type: "operator", value: two, start, end: i + 2 });
      i += 2;
      continue;
    }

    if (PUNCTUATION.has(ch) || ch === "!" || ch === "~" || ch === "&" || ch === "|" || ch === "^") {
      const type = PUNCTUATION.has(ch) ? "punctuation" : "operator";
      tokens.push({ type, value: ch, start, end: i + 1 });
      i++;
      continue;
    }

    if ("+-*%<>=".includes(ch)) {
      tokens.push({ type: "operator", value: ch, start, end: i + 1 });
      i++;
      continue;
    }

    // Single character fallback
    tokens.push({ type: "default", value: ch, start, end: i + 1 });
    i++;
  }

  return tokens;
}

/**
 * Convert token type to CSS class name for styling.
 */
export function tokenToClassName(type: TokenType): string {
  return `syntax-${type}`;
}
