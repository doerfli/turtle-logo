// ─── AST Node Types ────────────────────────────────────────────────────────

export type ASTNode =
  | ForwardCmd
  | BackwardCmd
  | RightCmd
  | LeftCmd
  | PenUpCmd
  | PenDownCmd
  | PenColorCmd
  | PenWidthCmd
  | ShowTurtleCmd
  | HideTurtleCmd
  | ClearScreenCmd
  | SetPosCmd
  | SetHeadingCmd
  | HomeCmd
  | RepeatCmd
  | ProcedureDefCmd
  | ProcedureCallCmd
  | IfCmd
  | IfElseCmd
  | MakeCmd
  | PrintCmd
  | StopCmd;

export type Expr = NumberExpr | StringExpr | VarExpr | BinOpExpr | NegExpr;

export interface NumberExpr {
  kind: 'number';
  value: number;
}

export interface StringExpr {
  kind: 'string';
  value: string;
}

export interface VarExpr {
  kind: 'var';
  name: string;
}

export interface BinOpExpr {
  kind: 'binop';
  op: '+' | '-' | '*' | '/' | '%';
  left: Expr;
  right: Expr;
}

export interface NegExpr {
  kind: 'neg';
  expr: Expr;
}

// ─── Commands ──────────────────────────────────────────────────────────────

export interface ForwardCmd   { kind: 'forward';    amount: Expr }
export interface BackwardCmd  { kind: 'backward';   amount: Expr }
export interface RightCmd     { kind: 'right';      degrees: Expr }
export interface LeftCmd      { kind: 'left';       degrees: Expr }
export interface PenUpCmd     { kind: 'penup' }
export interface PenDownCmd   { kind: 'pendown' }
export interface PenColorCmd  { kind: 'pencolor';   color: Expr }
export interface PenWidthCmd  { kind: 'penwidth';   width: Expr }
export interface ShowTurtleCmd { kind: 'showturtle' }
export interface HideTurtleCmd { kind: 'hideturtle' }
export interface ClearScreenCmd { kind: 'clearscreen' }
export interface SetPosCmd    { kind: 'setpos';     x: Expr; y: Expr }
export interface SetHeadingCmd { kind: 'setheading'; degrees: Expr }
export interface HomeCmd      { kind: 'home' }
export interface PrintCmd     { kind: 'print';      value: Expr }
export interface StopCmd      { kind: 'stop' }

export interface RepeatCmd {
  kind: 'repeat';
  count: Expr;
  body: ASTNode[];
}

export interface ProcedureDef {
  name: string;
  params: string[];
  body: ASTNode[];
}

export interface ProcedureDefCmd {
  kind: 'proceduredef';
  def: ProcedureDef;
}

export interface ProcedureCallCmd {
  kind: 'procedurecall';
  name: string;
  args: Expr[];
}

export interface IfCmd {
  kind: 'if';
  cond: BoolExpr;
  then: ASTNode[];
}

export interface IfElseCmd {
  kind: 'ifelse';
  cond: BoolExpr;
  then: ASTNode[];
  else: ASTNode[];
}

export interface MakeCmd {
  kind: 'make';
  name: string;
  value: Expr;
}

export type BoolExpr =
  | { kind: 'compare'; op: '<' | '>' | '=' | '<=' | '>='; left: Expr; right: Expr }
  | { kind: 'not'; expr: BoolExpr }
  | { kind: 'and'; left: BoolExpr; right: BoolExpr }
  | { kind: 'or';  left: BoolExpr; right: BoolExpr };
