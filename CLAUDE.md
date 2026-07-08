# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Turtle Logo: a hand-rolled [Logo](https://en.wikipedia.org/wiki/Logo_(programming_language)) interpreter with a React/Canvas playground UI, shipped both as a plain Vite web app and as a Tauri desktop app. Package manager is **bun** (`bun.lock` is authoritative); `npm`/`npx` also work against the same `node_modules`.

## Commands

```bash
bun install          # install deps
bun dev               # vite dev server (http://localhost:5173)
bun run build         # tsc -b && vite build (type-checks src/ including *.test.ts, then bundles)
bun run lint          # eslint .
bun run test          # vitest run (single pass, for CI/scripts)
bun run test:watch    # vitest (watch mode)
bun tauri:dev         # run inside the Tauri desktop shell (spawns `bun dev` itself)
bun tauri:build       # build the native desktop bundle
```

Run a single test file or test name:
```bash
npx vitest run src/interpreter/executor.test.ts
npx vitest run -t "STOP exits only the current procedure invocation"
```

Test files are colocated with source as `*.test.ts` (`src/interpreter/parser.test.ts`, `src/interpreter/executor.test.ts`, `src/examples/examples.test.ts`). `vitest.config.ts` runs in the `node` environment — there is no jsdom/canvas test setup, so the Canvas-based renderer is not unit-tested directly (see below).

## Architecture

### Interpreter pipeline

Logo source text flows through four layers, each in its own file under `src/interpreter/`:

1. **`parser.ts`** — hand-written tokenizer + recursive-descent parser, no external parser library. Produces an `ASTNode[]` (`ast.ts`). Command keywords and their two-letter aliases (`FD`/`BK`/`RT`/`LT`/`PU`/`PD`/`PC`/`PW`/`ST`/`HT`/`CS`/`SETH`) are resolved in `parseStatement`'s alias table.
2. **`ast.ts`** — plain discriminated-union node/expression types, no behavior.
3. **`executor.ts`** — a *generator-based* tree-walking interpreter (`function* execNode(...)`). It `yield`s an `ExecStep` (turtle state + optional draw command + optional log line) after every visible action, which is what lets the UI step through execution frame-by-frame or run at variable speed.
4. **`renderer/TurtleRenderer.ts`** — takes `ExecStep`/`DrawCommand` output and paints it to an offscreen `<canvas>`, then blits to the visible canvas each frame; also exports PNG/SVG.

`src/interpreter/index.ts` re-exports the public surface (`parse`, `execute`, `TurtleState`, `ExecStep`, `DrawCommand`) — import from there, not from the individual files, outside of the interpreter directory itself.

### Non-obvious invariants (read before touching movement/rotation or control flow)

- **Coordinate convention**: the turtle's world `x, y` is **y-up** (`+y` is up), matching `TurtleRenderer.toCanvas`'s explicit y-flip (`height/2 - wy`) to screen-pixel y-down space. `heading` is a compass bearing where `0 = up`, increasing = clockwise (`RIGHT`), decreasing = counterclockwise (`LEFT`). Two independent formulas must each stay consistent with this: `executor.ts`'s forward/backward uses `rad = (90 - heading)°` to get a movement vector; `TurtleRenderer.drawTurtle`'s icon rotation uses `rad = heading°` directly (different formula because the icon's local "nose" shape already points up before rotation, while the movement vector is derived from raw `cos`/`sin`). If you change one, re-derive the other — don't copy one formula into the other's spot.
- **`Env` (`executor.ts`) holds `number | string`**, not just numbers. `evalExpr` is strictly numeric (throws if it hits a string). `evalValue` allows either and is what backs `MAKE`, `PENCOLOR`, `PRINT`, and procedure-argument binding — this is what lets `PENCOLOR :COLOR`/`MAKE "C "cyan` work.
- **Procedures are registered in the parser's `this.procedures` map before their body is parsed**, not after (`parseStatement`'s `TO` branch). This is required so a procedure can call itself recursively with arguments from within its own body — the parser needs to already know the callee's arity to parse the call's argument list correctly.
- **`STOP` is a return-value signal, not an exception.** `execNode` returns `'stop' | undefined` (not `void`); `REPEAT`/`IF`/`IFELSE` bodies check and re-propagate that signal upward through `yield*` delegation, and `procedurecall` is the boundary that absorbs it (stopping only the current procedure invocation, per Logo semantics). Keep new block-like constructs consistent with this propagation pattern.
- **The keyword surface is defined in three places that must be kept in sync**: `parser.ts` (parsing/execution semantics), `executor.ts` (execution), and `components/Editor.tsx`'s `KEYWORDS`/`COLOR_NAMES` sets (syntax highlighting only, no behavior).
- **Known dead code, not a bug to "fix" blindly**: `RANDOM`/`SQRT`/`ABS`/`SIN`/`COS` are parsed in `parser.ts` (`parseAtom`) into a placeholder fake-variable-name encoding, but `executor.ts` never special-cases them — calling any of them throws `Undefined variable: __fn_...`. If asked to implement these, they need real executor support, not just parser plumbing.
- **Known limitation**: calling an undefined procedure *with arguments* (e.g. a typo'd name) fails at parse time with a confusing `Expected command, got ...` instead of a clean runtime `Undefined procedure` error, because the parser can't infer arity for a name it's never seen `TO`-defined. A zero-arg undefined call does correctly throw `Undefined procedure` at runtime.

### React / rendering layer

- **`hooks/useTurtle.ts`** owns the run loop: `run()`/`step()` call `parse()` then hold the resulting `execute()` generator in a ref; `tick()` pulls N steps per frame (`stepsPerFrameRef`) via `requestAnimationFrame` or `setTimeout` (for the "Slow" speed setting), applies draws to the `TurtleRenderer`, and pushes React state updates (`turtleState`, `logs`, `error`) only once per tick batch. Parse/runtime errors surface as `status: 'error'` + `error` message, not thrown across the hook boundary.
- **`App.tsx`** composes `Toolbar` + `Gallery` + `Editor` + `Canvas`, wires keyboard shortcut (F5 = run), and owns save/load/export — it branches on `isTauri()` (`'__TAURI_INTERNALS__' in window`) to pick between native dialogs (`@tauri-apps/plugin-dialog` + `plugin-fs`) and browser `<a download>`/file-input fallbacks.
- **`components/Editor.tsx`** is a CodeMirror 6 `StreamLanguage` with its own hand-rolled tokenizer for syntax highlighting only — it does not share code with `interpreter/parser.ts` and can drift out of sync with the real language (see keyword-surface note above).
- **`examples/index.ts`** is the source of truth for the Gallery's built-in programs; `examples.test.ts` smoke-tests that every one of them still parses and runs to completion.

### Dual runtime (web vs. Tauri desktop)

The same `dist/` build serves both: `bun dev`/`bun run build` run the plain Vite app, while `bun tauri:dev`/`bun tauri:build` (in `src-tauri/`, config at `src-tauri/tauri.conf.json`) wrap it in a native shell, invoking `bun run dev`/`bun run build` as its `beforeDevCommand`/`beforeBuildCommand`. The Tauri fs plugin is scoped to `$HOME/$DESKTOP/$DOCUMENT/$DOWNLOAD` and explicitly denies `$HOME/.ssh/**`.
