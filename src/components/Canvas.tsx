import { useEffect, useRef, memo } from 'react';
import { useTurtle } from '../hooks/useTurtle';
import type { TurtleState } from '../interpreter';

interface CanvasProps {
  turtleHook: ReturnType<typeof useTurtle>;
}

const TurtleCanvas = memo(function TurtleCanvas({ turtleHook }: CanvasProps) {
  const canvasRef = (turtleHook as unknown as { canvasRef: React.RefObject<HTMLCanvasElement> }).canvasRef;
  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />;
});

// Exported as a plain div+canvas so useTurtle can own the ref
interface CanvasContainerProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  turtleState: TurtleState;
}

export function CanvasContainer({ canvasRef, turtleState }: CanvasContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize canvas to match container on mount and resize
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
      }
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(container);
    return () => obs.disconnect();
  }, [canvasRef]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#1e1e2e' }}>
      <canvas
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        color: '#888', fontSize: 11, fontFamily: 'monospace', pointerEvents: 'none',
        background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4,
      }}>
        x:{turtleState.x.toFixed(1)} y:{turtleState.y.toFixed(1)} ↑{turtleState.heading.toFixed(0)}°
        {' '}{turtleState.penDown ? '✏️' : '✋'}
      </div>
    </div>
  );
}

export default TurtleCanvas;
