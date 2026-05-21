import type { RunStatus } from '../hooks/useTurtle';

interface ToolbarProps {
  status: RunStatus;
  onRun: () => void;
  onStop: () => void;
  onStep: () => void;
  onClear: () => void;
  onSpeedChange: (label: string, spf: number, msDelay?: number) => void;
  speed: string;
  penColor: string;
  penWidth: number;
  onPenColorChange: (c: string) => void;
  onPenWidthChange: (w: number) => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onSave: () => void;
  onLoad: () => void;
}

const SPEED_OPTIONS: { label: string; spf: number; msDelay?: number }[] = [
  { label: 'Slow',  spf: 1, msDelay: 200 },
  { label: '1×',    spf: 1 },
  { label: '4×',    spf: 4 },
  { label: '16×',   spf: 16 },
  { label: '64×',   spf: 64 },
  { label: 'Max',   spf: 99999 },
];

export function Toolbar({
  status, onRun, onStop, onStep, onClear,
  onSpeedChange, speed,
  penColor, penWidth, onPenColorChange, onPenWidthChange,
  onExportPNG, onExportSVG, onSave, onLoad,
}: ToolbarProps) {
  const running = status === 'running';

  return (
    <div style={styles.bar}>
      {/* Run / Stop */}
      <button style={styles.btn} onClick={running ? onStop : onRun} title={running ? 'Stop' : 'Run (F5)'}>
        {running ? '⏹ Stop' : '▶ Run'}
      </button>
      <button style={{ ...styles.btn, opacity: running ? 0.4 : 1 }} onClick={onStep} disabled={running} title="Step once">
        ⏭ Step
      </button>
      <button style={styles.btn} onClick={onClear} title="Clear canvas and reset turtle">
        🗑 Clear
      </button>

      <div style={styles.sep} />

      {/* Speed */}
      <span style={styles.label}>Speed:</span>
      {SPEED_OPTIONS.map(opt => (
        <button
          key={opt.spf}
          style={{ ...styles.btn, background: speed === opt.label ? '#3b4261' : undefined }}
          onClick={() => onSpeedChange(opt.label, opt.spf, opt.msDelay)}
        >
          {opt.label}
        </button>
      ))}

      <div style={styles.sep} />

      {/* Pen color */}
      <span style={styles.label}>Pen:</span>
      <input type="color" value={penColor} onChange={e => onPenColorChange(e.target.value)}
        style={{ width: 32, height: 28, border: 'none', cursor: 'pointer', background: 'none' }} title="Pen color" />
      <input type="number" value={penWidth} min={0.5} max={20} step={0.5}
        onChange={e => onPenWidthChange(parseFloat(e.target.value))}
        style={{ ...styles.numInput }} title="Pen width" />

      <div style={styles.sep} />

      {/* File */}
      <button style={styles.btn} onClick={onSave} title="Save program">💾 Save</button>
      <button style={styles.btn} onClick={onLoad} title="Load program">📂 Load</button>

      <div style={styles.sep} />

      {/* Export */}
      <button style={styles.btn} onClick={onExportPNG} title="Export canvas as PNG">🖼 PNG</button>
      <button style={styles.btn} onClick={onExportSVG} title="Export drawing as SVG">📐 SVG</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4,
    background: '#16161e', borderBottom: '1px solid #2a2a3c',
    padding: '6px 10px', minHeight: 44,
  },
  btn: {
    background: '#1e1e2e', color: '#cdd6f4',
    border: '1px solid #313244', borderRadius: 4,
    padding: '4px 10px', cursor: 'pointer', fontSize: 13,
    whiteSpace: 'nowrap',
  },
  sep: {
    width: 1, height: 24, background: '#313244', margin: '0 4px',
  },
  label: {
    color: '#6c7086', fontSize: 12, userSelect: 'none',
  },
  numInput: {
    width: 52, background: '#1e1e2e', color: '#cdd6f4',
    border: '1px solid #313244', borderRadius: 4, padding: '4px 6px', fontSize: 13,
  },
};
