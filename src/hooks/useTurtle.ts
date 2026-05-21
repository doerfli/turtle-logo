import { useRef, useCallback, useState } from 'react';
import { parse, execute } from '../interpreter';
import type { ExecStep, TurtleState } from '../interpreter';
import { TurtleRenderer } from '../renderer/TurtleRenderer';

export type RunStatus = 'idle' | 'running' | 'paused' | 'done' | 'error';

const DEFAULT_STATE: TurtleState = {
  x: 0, y: 0, heading: 0,
  penDown: true, penColor: '#00ff00', penWidth: 2, visible: true,
};

export function useTurtle(canvasRef: React.RefObject<HTMLCanvasElement | null>, initialPen?: { penColor?: string; penWidth?: number }) {
  const initialPenRef = useRef(initialPen);
  initialPenRef.current = initialPen;
  const rendererRef = useRef<TurtleRenderer | null>(null);
  const generatorRef = useRef<Generator<ExecStep, void, unknown> | null>(null);
  const rafRef = useRef<number>(0);
  const stepsPerFrameRef = useRef<number>(4);
  const msPerStepRef = useRef<number>(0);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [turtleState, setTurtleState] = useState<TurtleState>(DEFAULT_STATE);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getRenderer = useCallback((): TurtleRenderer | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (!rendererRef.current) rendererRef.current = new TurtleRenderer(canvas);
    return rendererRef.current;
  }, [canvasRef]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      if (msPerStepRef.current > 0) clearTimeout(rafRef.current);
      else cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = 0;
  }, []);

  const tick = useCallback(() => {
    const gen = generatorRef.current;
    const renderer = getRenderer();
    if (!gen || !renderer) return;

    let lastState: TurtleState | null = null;
    let done = false;
    const steps = stepsPerFrameRef.current;

    for (let i = 0; i < steps; i++) {
      let result: IteratorResult<ExecStep, void>;
      try {
        result = gen.next();
      } catch (e) {
        setError((e as Error).message);
        setStatus('error');
        stopLoop();
        return;
      }
      if (result.done) { done = true; break; }
      const step = result.value;
      if (step.draw) renderer.applyDraw(step.draw);
      if (step.log)  setLogs(prev => [...prev, step.log!]);
      lastState = step.state;
    }

    if (lastState) {
      renderer.render(lastState);
      setTurtleState(lastState);
    } else {
      // render without state change (draw still valid)
      renderer.render(turtleState);
    }

    if (done) {
      setStatus('done');
      stopLoop();
    } else if (msPerStepRef.current > 0) {
      rafRef.current = setTimeout(tick, msPerStepRef.current) as unknown as number;
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getRenderer, stopLoop]);

  const run = useCallback((code: string) => {
    stopLoop();
    setError(null);
    setLogs([]);
    setStatus('running');

    const renderer = getRenderer();
    if (!renderer) return;

    let nodes;
    try {
      nodes = parse(code);
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
      return;
    }

    const startState = { ...DEFAULT_STATE, ...initialPenRef.current };
    renderer.clear();
    renderer.render(startState);
    setTurtleState(startState);
    generatorRef.current = execute(nodes, initialPenRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [getRenderer, stopLoop, tick]);

  const stop = useCallback(() => {
    stopLoop();
    generatorRef.current = null;
    setStatus('idle');
  }, [stopLoop]);

  const step = useCallback((code: string) => {
    const renderer = getRenderer();
    if (!renderer) return;

    if (!generatorRef.current) {
      setError(null);
      setLogs([]);
      let nodes;
      try {
        nodes = parse(code);
      } catch (e) {
        setError((e as Error).message);
        setStatus('error');
        return;
      }
      const startState = { ...DEFAULT_STATE, ...initialPenRef.current };
      renderer.clear();
      renderer.render(startState);
      setTurtleState(startState);
      generatorRef.current = execute(nodes, initialPenRef.current);
    }

    let result: IteratorResult<ExecStep, void>;
    try {
      result = generatorRef.current.next();
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
      generatorRef.current = null;
      return;
    }

    if (result.done) {
      setStatus('done');
      generatorRef.current = null;
      return;
    }
    const step = result.value;
    if (step.draw) renderer.applyDraw(step.draw);
    if (step.log)  setLogs(prev => [...prev, step.log!]);
    renderer.render(step.state);
    setTurtleState(step.state);
    setStatus('paused');
  }, [getRenderer]);

  const clear = useCallback(() => {
    stopLoop();
    generatorRef.current = null;
    setStatus('idle');
    setError(null);
    setLogs([]);
    const startState = { ...DEFAULT_STATE, ...initialPenRef.current };
    setTurtleState(startState);
    const renderer = getRenderer();
    if (renderer) {
      renderer.clear();
      renderer.render(startState);
    }
  }, [getRenderer, stopLoop]);

  const setSpeed = useCallback((spf: number, msDelay = 0) => {
    stepsPerFrameRef.current = spf;
    msPerStepRef.current = msDelay;
  }, []);

  return { run, stop, step, clear, setSpeed, status, turtleState, logs, error, getRenderer };
}
