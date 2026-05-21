# Turtle Logo

A [Logo](https://en.wikipedia.org/wiki/Logo_(programming_language)) programming language interpreter and interactive playground. Write Logo programs in the built-in editor and watch the turtle draw on canvas in real time.

## Features

- **Logo interpreter** — full parser and generator-based executor supporting:
  - Movement: `FORWARD`, `BACKWARD`, `RIGHT`, `LEFT` (aliases: `FD`, `BK`, `RT`, `LT`)
  - Pen control: `PENUP`, `PENDOWN`, `PENCOLOR`, `PENWIDTH`
  - Turtle visibility: `SHOWTURTLE`, `HIDETURTLE`
  - Navigation: `HOME`, `SETPOS`, `SETHEADING`, `CLEARSCREEN`
  - Variables: `MAKE :VAR value`, `:VAR` references
  - Procedures: `TO name [:params] ... END`
  - Control flow: `REPEAT`, `IF`, `IFELSE`
  - Arithmetic: `+`, `-`, `*`, `/`, `%` with grouping via `()`
  - Boolean logic: `<`, `>`, `=`, `<=`, `>=`, `AND`, `OR`, `NOT`
  - Output: `PRINT`
- **Live canvas rendering** with a visible turtle sprite
- **Adjustable speed** — from slow step-by-step (200 ms/step) to instant
- **Step mode** — advance one instruction at a time
- **Pen color & width picker** in the toolbar
- **Export** drawings as PNG or SVG
- **Save / load** `.logo` program files
- **Built-in examples** — Square, Colorful Spiral, Star, Fractal Tree, Hexagon Web

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Example Programs

```logo
; Five-pointed star
PENCOLOR "gold
PENWIDTH 3
REPEAT 5 [
  FORWARD 120
  RIGHT 144
]
```

