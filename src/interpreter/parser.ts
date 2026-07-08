import type { ASTNode, Expr, BoolExpr, ProcedureDef } from './ast';

// ─── Token types ───────────────────────────────────────────────────────────

type TokenKind =
  | 'WORD' | 'NUMBER' | 'QUOTED_WORD' | 'VAR'
  | 'LBRACKET' | 'RBRACKET'
  | 'LPAREN' | 'RPAREN'
  | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'PERCENT'
  | 'LT' | 'GT' | 'EQ' | 'LTE' | 'GTE'
  | 'EOF';

interface Token {
  kind: TokenKind;
  value: string;
}

// ─── Tokenizer ─────────────────────────────────────────────────────────────

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    // skip whitespace and comments (;)
    if (/\s/.test(src[i])) { i++; continue; }
    if (src[i] === ';') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }

    if (src[i] === '[') { tokens.push({ kind: 'LBRACKET', value: '[' }); i++; continue; }
    if (src[i] === ']') { tokens.push({ kind: 'RBRACKET', value: ']' }); i++; continue; }
    if (src[i] === '(') { tokens.push({ kind: 'LPAREN', value: '(' }); i++; continue; }
    if (src[i] === ')') { tokens.push({ kind: 'RPAREN', value: ')' }); i++; continue; }
    if (src[i] === '+') { tokens.push({ kind: 'PLUS', value: '+' }); i++; continue; }
    if (src[i] === '*') { tokens.push({ kind: 'STAR', value: '*' }); i++; continue; }
    if (src[i] === '/') { tokens.push({ kind: 'SLASH', value: '/' }); i++; continue; }
    if (src[i] === '%') { tokens.push({ kind: 'PERCENT', value: '%' }); i++; continue; }

    if (src[i] === '<') {
      if (src[i + 1] === '=') { tokens.push({ kind: 'LTE', value: '<=' }); i += 2; }
      else { tokens.push({ kind: 'LT', value: '<' }); i++; }
      continue;
    }
    if (src[i] === '>') {
      if (src[i + 1] === '=') { tokens.push({ kind: 'GTE', value: '>=' }); i += 2; }
      else { tokens.push({ kind: 'GT', value: '>' }); i++; }
      continue;
    }
    if (src[i] === '=') { tokens.push({ kind: 'EQ', value: '=' }); i++; continue; }

    // minus vs negative number
    if (src[i] === '-') {
      tokens.push({ kind: 'MINUS', value: '-' }); i++; continue;
    }

    // variable reference :name
    if (src[i] === ':') {
      i++;
      let name = '';
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) name += src[i++];
      tokens.push({ kind: 'VAR', value: name });
      continue;
    }

    // quoted word "name
    if (src[i] === '"') {
      i++;
      let word = '';
      while (i < src.length && !/\s/.test(src[i]) && src[i] !== ']' && src[i] !== ')') word += src[i++];
      tokens.push({ kind: 'QUOTED_WORD', value: word });
      continue;
    }

    // number
    if (/[0-9]/.test(src[i]) || (src[i] === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let num = '';
      while (i < src.length && /[0-9.]/.test(src[i])) num += src[i++];
      tokens.push({ kind: 'NUMBER', value: num });
      continue;
    }

    // word (keyword or identifier)
    if (/[a-zA-Z_]/.test(src[i])) {
      let word = '';
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) word += src[i++];
      tokens.push({ kind: 'WORD', value: word.toUpperCase() });
      continue;
    }

    // skip unknown chars
    i++;
  }

  tokens.push({ kind: 'EOF', value: '' });
  return tokens;
}

// ─── Parser ────────────────────────────────────────────────────────────────

export class Parser {
  private tokens: Token[];
  private pos = 0;
  private procedures: Map<string, ProcedureDef> = new Map();

  constructor(src: string) {
    this.tokens = tokenize(src);
  }

  private peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }

  private expect(kind: TokenKind): Token {
    const t = this.consume();
    if (t.kind !== kind) throw new Error(`Expected ${kind}, got ${t.kind} ("${t.value}")`);
    return t;
  }

  private peekWord(): string | null {
    const t = this.peek();
    return t.kind === 'WORD' ? t.value : null;
  }

  // ── Expression parsing ────────────────────────────────────────────────

  parseExpr(): Expr {
    return this.parseAddSub();
  }

  private parseAddSub(): Expr {
    let left = this.parseMulDiv();
    while (this.peek().kind === 'PLUS' || this.peek().kind === 'MINUS') {
      const op = this.consume().value as '+' | '-';
      left = { kind: 'binop', op, left, right: this.parseMulDiv() };
    }
    return left;
  }

  private parseMulDiv(): Expr {
    let left = this.parseUnary();
    while (this.peek().kind === 'STAR' || this.peek().kind === 'SLASH' || this.peek().kind === 'PERCENT') {
      const op = this.consume().value as '*' | '/' | '%';
      left = { kind: 'binop', op, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): Expr {
    if (this.peek().kind === 'MINUS') {
      this.consume();
      return { kind: 'neg', expr: this.parseAtom() };
    }
    return this.parseAtom();
  }

  private parseAtom(): Expr {
    const t = this.peek();
    if (t.kind === 'NUMBER') { this.consume(); return { kind: 'number', value: parseFloat(t.value) }; }
    if (t.kind === 'VAR')    { this.consume(); return { kind: 'var', name: t.value }; }
    if (t.kind === 'QUOTED_WORD') { this.consume(); return { kind: 'string', value: t.value }; }
    if (t.kind === 'LPAREN') {
      this.consume();
      const expr = this.parseExpr();
      this.expect('RPAREN');
      return expr;
    }
    // Logo built-in numeric functions
    if (t.kind === 'WORD' && (t.value === 'RANDOM' || t.value === 'SQRT' || t.value === 'ABS' || t.value === 'SIN' || t.value === 'COS')) {
      this.consume();
      const arg = this.parseAtom();
      return { kind: 'binop', op: '+', left: { kind: 'number', value: 0 }, right: { kind: 'var', name: `__fn_${t.value}__` + JSON.stringify(arg) } };
      // Handled specially in executor; placeholder here
    }
    throw new Error(`Unexpected token in expression: ${t.kind} ("${t.value}")`);
  }

  parseBoolExpr(): BoolExpr {
    const t = this.peekWord();
    if (t === 'NOT') {
      this.consume();
      return { kind: 'not', expr: this.parseBoolExpr() };
    }
    if (t === 'AND') {
      this.consume();
      return { kind: 'and', left: this.parseBoolExpr(), right: this.parseBoolExpr() };
    }
    if (t === 'OR') {
      this.consume();
      return { kind: 'or', left: this.parseBoolExpr(), right: this.parseBoolExpr() };
    }
    const left = this.parseExpr();
    const op = this.peek();
    if (op.kind === 'LT' || op.kind === 'GT' || op.kind === 'EQ' || op.kind === 'LTE' || op.kind === 'GTE') {
      this.consume();
      const right = this.parseExpr();
      return { kind: 'compare', op: op.value as '<' | '>' | '=' | '<=' | '>=', left, right };
    }
    // default: non-zero => true
    return { kind: 'compare', op: '>', left, right: { kind: 'number', value: 0 } };
  }

  // ── Block parsing ─────────────────────────────────────────────────────

  parseBlock(): ASTNode[] {
    this.expect('LBRACKET');
    const nodes: ASTNode[] = [];
    while (this.peek().kind !== 'RBRACKET' && this.peek().kind !== 'EOF') {
      nodes.push(this.parseStatement());
    }
    this.expect('RBRACKET');
    return nodes;
  }

  // ── Statement parsing ─────────────────────────────────────────────────

  parseStatement(): ASTNode {
    const t = this.peek();

    if (t.kind !== 'WORD') throw new Error(`Expected command, got ${t.kind} ("${t.value}")`);
    const w = t.value;

    // Procedure definition
    if (w === 'TO') {
      this.consume();
      const nameToken = this.expect('WORD');
      const params: string[] = [];
      while (this.peek().kind === 'VAR') params.push(this.consume().value);
      const def: ProcedureDef = { name: nameToken.value, params, body: [] };
      this.procedures.set(nameToken.value, def); // register before parsing body so self-recursive calls know arity
      while (this.peekWord() !== 'END' && this.peek().kind !== 'EOF') def.body.push(this.parseStatement());
      this.expect('WORD'); // END
      return { kind: 'proceduredef', def };
    }

    // Aliases map
    const aliases: Record<string, string> = {
      FD: 'FORWARD', BK: 'BACKWARD', RT: 'RIGHT', LT: 'LEFT',
      PU: 'PENUP', PD: 'PENDOWN', PC: 'PENCOLOR', PW: 'PENWIDTH',
      ST: 'SHOWTURTLE', HT: 'HIDETURTLE', CS: 'CLEARSCREEN',
      SETPOS: 'SETPOS', SETH: 'SETHEADING',
    };
    const cmd = aliases[w] ?? w;
    this.consume();

    switch (cmd) {
      case 'FORWARD':    return { kind: 'forward',    amount:  this.parseExpr() };
      case 'BACKWARD':   return { kind: 'backward',   amount:  this.parseExpr() };
      case 'RIGHT':      return { kind: 'right',      degrees: this.parseExpr() };
      case 'LEFT':       return { kind: 'left',       degrees: this.parseExpr() };
      case 'PENUP':      return { kind: 'penup' };
      case 'PENDOWN':    return { kind: 'pendown' };
      case 'SHOWTURTLE': return { kind: 'showturtle' };
      case 'HIDETURTLE': return { kind: 'hideturtle' };
      case 'CLEARSCREEN':return { kind: 'clearscreen' };
      case 'HOME':       return { kind: 'home' };
      case 'PENWIDTH':   return { kind: 'penwidth',   width:   this.parseExpr() };
      case 'SETHEADING': return { kind: 'setheading', degrees: this.parseExpr() };
      case 'PRINT':      return { kind: 'print',      value:   this.parseExpr() };
      case 'STOP':       return { kind: 'stop' };
      case 'PENCOLOR': {
        // PENCOLOR "red  OR  PENCOLOR [r g b]  OR  PENCOLOR :var
        if (this.peek().kind === 'QUOTED_WORD') {
          const color = this.consume().value;
          return { kind: 'pencolor', color: { kind: 'string', value: color } };
        }
        if (this.peek().kind === 'LBRACKET') {
          this.consume();
          const r = Math.round(parseFloat(this.expect('NUMBER').value));
          const g = Math.round(parseFloat(this.expect('NUMBER').value));
          const b = Math.round(parseFloat(this.expect('NUMBER').value));
          this.expect('RBRACKET');
          return { kind: 'pencolor', color: { kind: 'string', value: `rgb(${r},${g},${b})` } };
        }
        if (this.peek().kind === 'VAR') {
          return { kind: 'pencolor', color: this.parseExpr() };
        }
        return { kind: 'pencolor', color: { kind: 'string', value: 'black' } };
      }
      case 'SETPOS': {
        this.expect('LBRACKET');
        const x = this.parseExpr();
        const y = this.parseExpr();
        this.expect('RBRACKET');
        return { kind: 'setpos', x, y };
      }
      case 'REPEAT': {
        const count = this.parseExpr();
        const body  = this.parseBlock();
        return { kind: 'repeat', count, body };
      }
      case 'IF': {
        const cond = this.parseBoolExpr();
        const then = this.parseBlock();
        return { kind: 'if', cond, then };
      }
      case 'IFELSE': {
        const cond = this.parseBoolExpr();
        const then = this.parseBlock();
        const els  = this.parseBlock();
        return { kind: 'ifelse', cond, then, else: els };
      }
      case 'MAKE': {
        const nameToken = this.expect('QUOTED_WORD');
        const value = this.parseExpr();
        return { kind: 'make', name: nameToken.value.toUpperCase(), value };
      }
      default: {
        // User-defined procedure call
        const def = this.procedures.get(cmd);
        const args: import('./ast').Expr[] = [];
        if (def) {
          for (let i = 0; i < def.params.length; i++) args.push(this.parseExpr());
        }
        return { kind: 'procedurecall', name: cmd, args };
      }
    }
  }

  parse(): ASTNode[] {
    const nodes: ASTNode[] = [];
    while (this.peek().kind !== 'EOF') {
      nodes.push(this.parseStatement());
    }
    return nodes;
  }
}

export function parse(src: string): ASTNode[] {
  return new Parser(src).parse();
}
