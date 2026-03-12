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
  | "variableDeclaration"
  | "variableUsage"
  | "parameter"
  | "function"
  | "property"
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

const DECLARATION_KEYWORDS = new Set(["let", "const", "var"]);

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
 * First pass: collect variable names (let/const/var/for) and parameter names (function/arrow).
 * Declaration site = purple; usages = white; parameters = orange (Dracula).
 */
function collectDeclaredVariables(source: string): {
  declaredVariables: Set<string>;
  parameters: Set<string>;
} {
  const declaredVariables = new Set<string>();
  const parameters = new Set<string>();
  const n = source.length;
  let i = 0;

  function skipWhitespace(): void {
    while (i < n && isWhitespace(source[i])) i++;
  }

  function readIdentifier(): string {
    if (i >= n || !isLetterOrUnderscore(source[i])) return "";
    let value = "";
    while (i < n && isIdentifierPart(source[i])) {
      value += source[i];
      i++;
    }
    return value;
  }

  function skipString(q: string): void {
    if (source[i] !== q) return;
    i++;
    while (i < n) {
      if (source[i] === "\\") {
        i += 2;
        continue;
      }
      if (source[i] === q) {
        i++;
        break;
      }
      i++;
    }
  }

  function skipLineComment(): void {
    if (source[i] === "/" && source[i + 1] === "/") {
      i += 2;
      while (i < n && source[i] !== "\n") i++;
    }
  }

  function skipBlockComment(): void {
    if (source[i] === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < n - 1 && (source[i] !== "*" || source[i + 1] !== "/")) i++;
      if (i < n - 1) i += 2;
    }
  }

  function skipTemplate(): void {
    if (source[i] !== "`") return;
    i++;
    while (i < n) {
      if (source[i] === "\\") {
        i += 2;
        continue;
      }
      if (source[i] === "`") {
        i++;
        return;
      }
      if (source[i] === "$" && source[i + 1] === "{") {
        i += 2;
        let depth = 1;
        while (i < n && depth > 0) {
          const c = source[i];
          if (c === "{" || c === "(" || c === "[") depth++;
          else if (c === "}" || c === ")" || c === "]") depth--;
          i++;
        }
        continue;
      }
      i++;
    }
  }

  while (i < n) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      skipString(ch);
      continue;
    }
    if (ch === "`") {
      skipTemplate();
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      skipLineComment();
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      skipBlockComment();
      continue;
    }
    if (isLetterOrUnderscore(ch)) {
      const word = readIdentifier();
      if (DECLARATION_KEYWORDS.has(word)) {
        skipWhitespace();
        // Collect identifiers until we hit = or ; or ( or newline
        while (i < n) {
          const c = source[i];
          if (isWhitespace(c)) {
            skipWhitespace();
            continue;
          }
          if (c === "=" || c === ";" || c === "(" || c === "\n" || c === "{") break;
          if (c === ",") {
            i++;
            skipWhitespace();
            continue;
          }
          const id = readIdentifier();
          if (id && !JS_KEYWORDS.has(id) && !TS_TYPE_KEYWORDS.has(id)) {
            declaredVariables.add(id);
          }
          if (i >= n) break;
          if (source[i] === ",") i++;
          else break;
        }
        continue;
      }
      if (word === "function") {
        skipWhitespace();
        readIdentifier(); // function name – not added to declared (stays identifier/function)
        skipWhitespace();
        if (source[i] === "(") {
          i++;
          while (i < n && source[i] !== ")") {
            skipWhitespace();
            if (source[i] === ")") break;
            if (source[i] === "," || source[i] === ".") {
              i++;
              continue;
            }
            const param = readIdentifier();
            if (param && !JS_KEYWORDS.has(param) && !TS_TYPE_KEYWORDS.has(param)) {
              parameters.add(param);
            }
            while (i < n && source[i] !== ")" && source[i] !== ",") i++;
            if (source[i] === ",") i++;
          }
        }
        continue;
      }
      if (word === "for") {
        skipWhitespace();
        if (source[i] === "(") {
          i++;
          skipWhitespace();
          const inOrOf = readIdentifier();
          if (inOrOf === "const" || inOrOf === "let" || inOrOf === "var") {
            skipWhitespace();
            const id = readIdentifier();
            if (id) declaredVariables.add(id);
          }
        }
        continue;
      }
      continue;
    }
    // Arrow function params: (id, id) =>
    if (ch === "(") {
      i++;
      const ids: string[] = [];
      while (i < n && source[i] !== ")") {
        skipWhitespace();
        if (source[i] === ")") break;
        if (source[i] === "," || source[i] === "." || source[i] === "{" || source[i] === "[") {
          i++;
          continue;
        }
        const id = readIdentifier();
        if (id && !JS_KEYWORDS.has(id) && !TS_TYPE_KEYWORDS.has(id)) ids.push(id);
        while (i < n && source[i] !== ")" && source[i] !== ",") i++;
        if (source[i] === ",") i++;
      }
      if (source[i] === ")") i++;
      skipWhitespace();
      if (source[i] === "=" && source[i + 1] === ">") {
        ids.forEach((id) => parameters.add(id));
      }
      continue;
    }
    i++;
  }

  return { declaredVariables, parameters };
}

/**
 * Tokenize JS/TS source into an array of tokens for syntax highlighting.
 */
export function tokenize(source: string): Token[] {
  const { declaredVariables, parameters } = collectDeclaredVariables(source);
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

    // Division operator (when not parsed as regex above)
    if (ch === "/") {
      tokens.push({ type: "operator", value: "/", start, end: i + 1 });
      i++;
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
      let type: TokenType = JS_KEYWORDS.has(value)
        ? "keyword"
        : TS_TYPE_KEYWORDS.has(value)
          ? "type"
          : "identifier";

      if (type === "identifier") {
        const afterDot = prevToken?.value === ".";
        const atDeclaration =
          prevToken?.type === "keyword" &&
          (prevToken.value === "const" || prevToken.value === "let" || prevToken.value === "var");
        let j = i;
        while (j < n && isWhitespace(source[j])) j++;
        const nextIsParen = source[j] === "(";

        if (parameters.has(value)) {
          type = "parameter";
        } else if (declaredVariables.has(value)) {
          type = atDeclaration ? "variableDeclaration" : "variableUsage";
        } else if (afterDot) {
          type = nextIsParen ? "function" : "property";
        } else if (nextIsParen) {
          type = "function";
        }
        // else stays "identifier" (e.g. console – purple in Dracula)
      }

      tokens.push({ type, value, start, end: i });
      continue;
    }

    // Multi-char operators / punctuation
    const two = source.slice(i, i + 2);
    if (
      two === "?." ||
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
