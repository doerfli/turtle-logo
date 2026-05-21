import type { ASTNode, Expr, BoolExpr } from './ast';

// ─── Turtle State ──────────────────────────────────────────────────────────

export interface TurtleState {
  x: number;
  y: number;
  heading: number; // degrees, 0 = up (north)
  penDown: boolean;
  penColor: string;
  penWidth: number;
  visible: boolean;
}

export interface DrawCommand {
  type: 'line' | 'move' | 'clear';
  x1?: number; y1?: number;
  x2?: number; y2?: number;
  color?: string;
  width?: number;
}

export interface ExecStep {
  state: TurtleState;
  draw?: DrawCommand;
  log?: string;
}

export type Env = Map<string, number>;

function evalExpr(expr: Expr, env: Env): number {
  switch (expr.kind) {
    case 'number':  return expr.value;
    case 'var': {
      const key = expr.name.toUpperCase();
      if (!env.has(key)) throw new Error(`Undefined variable: ${expr.name}`);
      return env.get(key)!;
    }
    case 'neg':    return -evalExpr(expr.expr, env);
    case 'binop': {
      const l = evalExpr(expr.left, env);
      const r = evalExpr(expr.right, env);
      switch (expr.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': if (r === 0) throw new Error('Division by zero'); return l / r;
        case '%': return l % r;
      }
    }
  }
}

function evalBool(expr: BoolExpr, env: Env): boolean {
  switch (expr.kind) {
    case 'compare': {
      const l = evalExpr(expr.left, env);
      const r = evalExpr(expr.right, env);
      switch (expr.op) {
        case '<': return l < r;
        case '>': return l > r;
        case '=': return l === r;
        case '<=': return l <= r;
        case '>=': return l >= r;
      }
    }
    case 'not':  return !evalBool(expr.expr, env);
    case 'and':  return evalBool(expr.left, env) && evalBool(expr.right, env);
    case 'or':   return evalBool(expr.left, env) || evalBool(expr.right, env);
  }
}

function cloneState(s: TurtleState): TurtleState {
  return { ...s };
}

// ─── Generator-based executor ──────────────────────────────────────────────

type ProcedureRegistry = Map<string, { params: string[]; body: ASTNode[] }>;

function* execNode(
  node: ASTNode,
  state: TurtleState,
  env: Env,
  procs: ProcedureRegistry,
): Generator<ExecStep, void, unknown> {
  switch (node.kind) {
    case 'forward':
    case 'backward': {
      const dist = evalExpr(node.kind === 'forward' ? node.amount : node.amount, env) * (node.kind === 'backward' ? -1 : 1);
      const rad = ((state.heading - 90) * Math.PI) / 180;
      const nx = state.x + dist * Math.cos(rad);
      const ny = state.y + dist * Math.sin(rad);
      const draw: DrawCommand = state.penDown
        ? { type: 'line', x1: state.x, y1: state.y, x2: nx, y2: ny, color: state.penColor, width: state.penWidth }
        : { type: 'move', x2: nx, y2: ny };
      state.x = nx;
      state.y = ny;
      yield { state: cloneState(state), draw };
      break;
    }
    case 'right':  state.heading = (state.heading + evalExpr(node.degrees, env)) % 360; yield { state: cloneState(state) }; break;
    case 'left':   state.heading = ((state.heading - evalExpr(node.degrees, env)) % 360 + 360) % 360; yield { state: cloneState(state) }; break;
    case 'penup':   state.penDown = false; yield { state: cloneState(state) }; break;
    case 'pendown': state.penDown = true;  yield { state: cloneState(state) }; break;
    case 'pencolor': state.penColor = node.color; yield { state: cloneState(state) }; break;
    case 'penwidth': state.penWidth = evalExpr(node.width, env); yield { state: cloneState(state) }; break;
    case 'showturtle': state.visible = true;  yield { state: cloneState(state) }; break;
    case 'hideturtle': state.visible = false; yield { state: cloneState(state) }; break;
    case 'clearscreen': {
      state.x = 0; state.y = 0; state.heading = 0; state.penDown = true; state.visible = true;
      yield { state: cloneState(state), draw: { type: 'clear' } };
      break;
    }
    case 'home': {
      state.x = 0; state.y = 0; state.heading = 0;
      yield { state: cloneState(state) };
      break;
    }
    case 'setpos': {
      state.x = evalExpr(node.x, env);
      state.y = evalExpr(node.y, env);
      yield { state: cloneState(state) };
      break;
    }
    case 'setheading': {
      state.heading = evalExpr(node.degrees, env) % 360;
      yield { state: cloneState(state) };
      break;
    }
    case 'print': {
      const val = evalExpr(node.value, env);
      yield { state: cloneState(state), log: String(val) };
      break;
    }
    case 'make': {
      env.set(node.name.toUpperCase(), evalExpr(node.value, env));
      yield { state: cloneState(state) };
      break;
    }
    case 'repeat': {
      const n = Math.round(evalExpr(node.count, env));
      for (let i = 0; i < n; i++) {
        for (const child of node.body) {
          yield* execNode(child, state, env, procs);
        }
      }
      break;
    }
    case 'proceduredef': {
      procs.set(node.def.name, { params: node.def.params, body: node.def.body });
      yield { state: cloneState(state) };
      break;
    }
    case 'procedurecall': {
      const proc = procs.get(node.name);
      if (!proc) throw new Error(`Undefined procedure: ${node.name}`);
      const localEnv: Env = new Map(env);
      for (let i = 0; i < proc.params.length; i++) {
        localEnv.set(proc.params[i].toUpperCase(), evalExpr(node.args[i] ?? { kind: 'number', value: 0 }, env));
      }
      for (const child of proc.body) {
        yield* execNode(child, state, localEnv, procs);
      }
      break;
    }
    case 'if': {
      if (evalBool(node.cond, env)) {
        for (const child of node.then) yield* execNode(child, state, env, procs);
      }
      break;
    }
    case 'ifelse': {
      const branch = evalBool(node.cond, env) ? node.then : node.else;
      for (const child of branch) yield* execNode(child, state, env, procs);
      break;
    }
  }
}

export function* execute(
  nodes: ASTNode[],
  initialState?: Partial<TurtleState>,
): Generator<ExecStep, void, unknown> {
  const state: TurtleState = {
    x: 0, y: 0, heading: 0,
    penDown: true, penColor: '#00ff00', penWidth: 2,
    visible: true,
    ...initialState,
  };
  const env: Env = new Map();
  const procs: ProcedureRegistry = new Map();
  for (const node of nodes) {
    yield* execNode(node, state, env, procs);
  }
}
