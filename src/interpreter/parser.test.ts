import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import type {
  ForwardCmd, MakeCmd, ProcedureDefCmd, ProcedureCallCmd,
  RepeatCmd, IfCmd, IfElseCmd, PenColorCmd,
} from './ast';

describe('tokenizing / basic statements', () => {
  it('parses a simple command with a numeric argument', () => {
    const ast = parse('FORWARD 100');
    expect(ast).toEqual([{ kind: 'forward', amount: { kind: 'number', value: 100 } }]);
  });

  it('ignores comments', () => {
    const ast = parse('FORWARD 10 ; go forward\nRIGHT 90');
    expect(ast).toHaveLength(2);
  });

  it('is case-insensitive on keywords', () => {
    const ast = parse('forward 10');
    expect(ast).toEqual([{ kind: 'forward', amount: { kind: 'number', value: 10 } }]);
  });
});

describe('command aliases', () => {
  const cases: [string, string][] = [
    ['FD 1', 'forward'],
    ['BK 1', 'backward'],
    ['RT 1', 'right'],
    ['LT 1', 'left'],
  ];
  for (const [src, kind] of cases) {
    it(`${src.split(' ')[0]} aliases to ${kind}`, () => {
      const [node] = parse(src);
      expect(node.kind).toBe(kind);
    });
  }

  it('PU/PD/PC/PW/ST/HT/CS alias correctly', () => {
    const kinds = parse('PU\nPD\nPC "red\nPW 2\nST\nHT\nCS').map(n => n.kind);
    expect(kinds).toEqual(['penup', 'pendown', 'pencolor', 'penwidth', 'showturtle', 'hideturtle', 'clearscreen']);
  });
});

describe('expressions', () => {
  it('parses arithmetic with correct precedence', () => {
    const [node] = parse('FORWARD 2 + 3 * 4') as [ForwardCmd];
    expect(node.amount).toEqual({
      kind: 'binop', op: '+',
      left: { kind: 'number', value: 2 },
      right: { kind: 'binop', op: '*', left: { kind: 'number', value: 3 }, right: { kind: 'number', value: 4 } },
    });
  });

  it('parses parenthesized expressions', () => {
    const [node] = parse('FORWARD (2 + 3) * 4') as [ForwardCmd];
    const amount = node.amount as { kind: 'binop'; op: string; left: unknown };
    expect(amount.op).toBe('*');
    expect(amount.left).toEqual({ kind: 'binop', op: '+', left: { kind: 'number', value: 2 }, right: { kind: 'number', value: 3 } });
  });

  it('parses a variable reference', () => {
    const [node] = parse('FORWARD :SIZE') as [ForwardCmd];
    expect(node.amount).toEqual({ kind: 'var', name: 'SIZE' });
  });

  it('parses a quoted word as a string expression atom', () => {
    const [node] = parse('MAKE "COLOR "cyan') as [MakeCmd];
    expect(node).toEqual({ kind: 'make', name: 'COLOR', value: { kind: 'string', value: 'cyan' } });
  });
});

describe('procedure definitions', () => {
  it('parses TO/END with parameters', () => {
    const [def] = parse('TO SQ :SIZE\n  FORWARD :SIZE\nEND') as [ProcedureDefCmd];
    expect(def.kind).toBe('proceduredef');
    expect(def.def.name).toBe('SQ');
    expect(def.def.params).toEqual(['SIZE']);
    expect(def.def.body).toHaveLength(1);
  });

  it('parses call arguments for a procedure defined earlier', () => {
    const ast = parse('TO SQ :SIZE\n  FORWARD :SIZE\nEND\nSQ 42') as [ProcedureDefCmd, ProcedureCallCmd];
    expect(ast[1]).toEqual({ kind: 'procedurecall', name: 'SQ', args: [{ kind: 'number', value: 42 }] });
  });

  it('parses call arguments inside a self-recursive procedure body (regression)', () => {
    // Previously, TREE wasn't registered until its whole body was parsed, so a call to TREE
    // from within its own body didn't know it took a parameter and silently dropped the argument,
    // corrupting the rest of the parse.
    const [def] = parse(`
      TO TREE :SIZE
        TREE :SIZE * 0.7
      END
    `) as [ProcedureDefCmd];
    expect(def.def.body).toHaveLength(1);
    expect(def.def.body[0]).toEqual({
      kind: 'procedurecall',
      name: 'TREE',
      args: [{ kind: 'binop', op: '*', left: { kind: 'var', name: 'SIZE' }, right: { kind: 'number', value: 0.7 } }],
    });
  });
});

describe('control flow', () => {
  it('parses REPEAT with a block', () => {
    const [node] = parse('REPEAT 4 [ FORWARD 10 RIGHT 90 ]') as [RepeatCmd];
    expect(node.kind).toBe('repeat');
    expect(node.count).toEqual({ kind: 'number', value: 4 });
    expect(node.body).toHaveLength(2);
  });

  it('parses IF with a comparison condition', () => {
    const [node] = parse('IF :SIZE < 5 [STOP]') as [IfCmd];
    expect(node.kind).toBe('if');
    expect(node.cond).toEqual({ kind: 'compare', op: '<', left: { kind: 'var', name: 'SIZE' }, right: { kind: 'number', value: 5 } });
    expect(node.then).toEqual([{ kind: 'stop' }]);
  });

  it('parses IFELSE with both branches', () => {
    const [node] = parse('IFELSE 1 < 2 [ FORWARD 1 ] [ BACKWARD 1 ]') as [IfElseCmd];
    expect(node.kind).toBe('ifelse');
    expect(node.then).toHaveLength(1);
    expect(node.else).toHaveLength(1);
  });
});

describe('PENCOLOR argument forms', () => {
  it('parses a literal color', () => {
    const [node] = parse('PENCOLOR "gold') as [PenColorCmd];
    expect(node.color).toEqual({ kind: 'string', value: 'gold' });
  });

  it('parses an [r g b] block into an rgb() string', () => {
    const [node] = parse('PENCOLOR [10 20 30]') as [PenColorCmd];
    expect(node.color).toEqual({ kind: 'string', value: 'rgb(10,20,30)' });
  });

  it('parses a variable color argument', () => {
    const [node] = parse('PENCOLOR :COLOR') as [PenColorCmd];
    expect(node.color).toEqual({ kind: 'var', name: 'COLOR' });
  });

  it('defaults to black with no argument', () => {
    const [node] = parse('PENCOLOR\nFORWARD 1') as [PenColorCmd];
    expect(node.color).toEqual({ kind: 'string', value: 'black' });
  });
});
