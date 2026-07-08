import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { execute, type ExecStep, type DrawCommand } from './executor';

function run(src: string) {
  const steps: ExecStep[] = [...execute(parse(src))];
  const lines = steps.map(s => s.draw).filter((d): d is DrawCommand => d?.type === 'line');
  const logs = steps.filter(s => s.log !== undefined).map(s => s.log!);
  const finalState = steps[steps.length - 1]?.state;
  return { steps, lines, logs, finalState };
}

describe('movement', () => {
  it('FORWARD at heading 0 moves in +y (up, in this y-up world convention)', () => {
    const { finalState } = run('FORWARD 100');
    expect(finalState.x).toBeCloseTo(0);
    expect(finalState.y).toBeCloseTo(100);
  });

  it('BACKWARD moves opposite of FORWARD', () => {
    const { finalState } = run('BACKWARD 100');
    expect(finalState.x).toBeCloseTo(0);
    expect(finalState.y).toBeCloseTo(-100);
  });

  it('RIGHT 90 then FORWARD moves in +x', () => {
    const { finalState } = run('RIGHT 90\nFORWARD 100');
    expect(finalState.x).toBeCloseTo(100);
    expect(finalState.y).toBeCloseTo(0);
  });

  it('LEFT 90 then FORWARD moves in -x', () => {
    const { finalState } = run('LEFT 90\nFORWARD 100');
    expect(finalState.x).toBeCloseTo(-100);
    expect(finalState.y).toBeCloseTo(0);
  });

  it('REPEAT 4 [FORWARD 10 RIGHT 90] returns to the start heading', () => {
    const { finalState } = run('REPEAT 4 [ FORWARD 10 RIGHT 90 ]');
    expect(finalState.x).toBeCloseTo(0);
    expect(finalState.y).toBeCloseTo(0);
    expect(finalState.heading % 360).toBeCloseTo(0);
  });
});

describe('turning direction (regression: LEFT/RIGHT screen handedness)', () => {
  // Mirrors TurtleRenderer's toCanvas transform (world y-up -> canvas y-down pixels).
  // A previous bug had these two conventions disagree, which made LEFT visually turn right.
  const toCanvasDelta = (dx: number, dy: number): [number, number] => [dx, -dy];

  function screenDirections(src: string): string[] {
    const { lines } = run(src);
    return lines.map(l => {
      const [dx, dy] = toCanvasDelta(l.x2! - l.x1!, l.y2! - l.y1!);
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    });
  }

  it('RIGHT-only square traces clockwise on screen', () => {
    expect(screenDirections('REPEAT 4 [ FORWARD 100 RIGHT 90 ]')).toEqual(['up', 'right', 'down', 'left']);
  });

  it('LEFT-only square traces counterclockwise on screen', () => {
    expect(screenDirections('REPEAT 4 [ FORWARD 100 LEFT 90 ]')).toEqual(['up', 'left', 'down', 'right']);
  });
});

describe('IF / IFELSE', () => {
  it('IF executes the block when the condition is true', () => {
    const { finalState } = run('IF 1 < 2 [ FORWARD 50 ]');
    expect(finalState.y).toBeCloseTo(50);
  });

  it('IF skips the block when the condition is false', () => {
    // A trailing no-op PENDOWN just gives us a yielded step to read the (unchanged) state from.
    const { finalState } = run('IF 2 < 1 [ FORWARD 50 ]\nPENDOWN');
    expect(finalState.y).toBeCloseTo(0);
  });

  it('IFELSE runs the else branch when the condition is false', () => {
    const { finalState } = run('IFELSE 2 < 1 [ FORWARD 50 ] [ FORWARD 25 ]');
    expect(finalState.y).toBeCloseTo(25);
  });
});

describe('procedures & recursion', () => {
  it('defines and calls a procedure with a parameter', () => {
    const { finalState } = run('TO SQ :SIZE\n  FORWARD :SIZE\nEND\nSQ 42');
    expect(finalState.y).toBeCloseTo(42);
  });

  it('calling an undefined zero-arg procedure throws a clear error', () => {
    // Note: an undefined procedure called *with* arguments currently fails at parse time
    // instead ("Expected command, got ...") because the parser can't infer the arity of a
    // name it has never seen defined. That's a separate, pre-existing limitation.
    expect(() => run('NOSUCHPROC')).toThrow(/Undefined procedure: NOSUCHPROC/);
  });

  it('a self-recursive procedure with an argument parses and runs (regression: arity was unknown during self-recursive parsing)', () => {
    const src = `
      TO TREE :SIZE
        IF :SIZE < 5 [STOP]
        FORWARD :SIZE
        LEFT 30
        TREE :SIZE * 0.7
        RIGHT 60
        TREE :SIZE * 0.7
        LEFT 30
        BACKWARD :SIZE
      END
      TREE 80
    `;
    const { lines, finalState } = run(src);
    expect(lines.length).toBeGreaterThan(0);
    // TREE always returns to where it started (forward then backward the same amount).
    expect(finalState.x).toBeCloseTo(0);
    expect(finalState.y).toBeCloseTo(0);
  });

  it('recursive calls do not clobber the caller\'s copy of a same-named parameter', () => {
    const src = `
      TO COUNT :N
        PRINT :N
        IF :N > 0 [ COUNT :N - 1 ]
        PRINT :N
      END
      COUNT 2
    `;
    const { logs } = run(src);
    // Each frame prints its own :N both before and after the recursive call returns,
    // proving the callee's decremented :N never overwrote the caller's binding.
    expect(logs).toEqual(['2', '1', '0', '0', '1', '2']);
  });

  it('STOP exits only the current procedure invocation, not the whole script', () => {
    const src = `
      TO COUNTDOWN :N
        IF :N < 0 [STOP]
        PRINT :N
        COUNTDOWN :N - 1
        PRINT 12345
      END
      COUNTDOWN 3
      PRINT 999
    `;
    const { logs } = run(src);
    expect(logs).toEqual(['3', '2', '1', '0', '12345', '12345', '12345', '12345', '999']);
  });

  it('STOP inside REPEAT/IF only unwinds to the enclosing procedure', () => {
    const src = `
      TO NESTED :N
        REPEAT 3 [
          IF :N > 100 [STOP]
          PRINT :N
        ]
      END
      NESTED 5
      PRINT 999
    `;
    const { logs } = run(src);
    expect(logs).toEqual(['5', '5', '5', '999']);
  });
});

describe('MAKE / PRINT / variables', () => {
  it('MAKE assigns a numeric variable readable by PRINT', () => {
    const { logs } = run('MAKE "X 7\nPRINT :X');
    expect(logs).toEqual(['7']);
  });

  it('MAKE assigns a string variable readable by PRINT', () => {
    const { logs } = run('MAKE "C "cyan\nPRINT :C');
    expect(logs).toEqual(['cyan']);
  });

  it('using a string variable in a numeric expression throws a clear error', () => {
    expect(() => run('MAKE "C "cyan\nFORWARD :C')).toThrow(/Cannot use text variable :C/);
  });

  it('reading an undefined variable throws a clear error', () => {
    expect(() => run('PRINT :NOPE')).toThrow(/Undefined variable: NOPE/);
  });
});

describe('PENCOLOR', () => {
  it('accepts a literal quoted word', () => {
    const { finalState } = run('PENCOLOR "gold\nFORWARD 1');
    expect(finalState.penColor).toBe('gold');
  });

  it('accepts an [r g b] block', () => {
    const { finalState } = run('PENCOLOR [10 20 30]\nFORWARD 1');
    expect(finalState.penColor).toBe('rgb(10,20,30)');
  });

  it('accepts a variable holding a color name (regression: Colorful Spiral example)', () => {
    const src = `
      TO SPIRAL :STEP :COLOR
        PENCOLOR :COLOR
        FORWARD :STEP
        RIGHT 91
        IF :STEP < 150 [SPIRAL :STEP + 2 :COLOR]
      END
      SPIRAL 5 "cyan
    `;
    const { finalState } = run(src);
    expect(finalState.penColor).toBe('cyan');
  });
});
