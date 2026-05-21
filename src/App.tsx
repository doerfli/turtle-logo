// App replaced — see full implementation below
import { useRef, useState, useCallback, useEffect } from 'react';
import Editor from './components/Editor';
import { CanvasContainer } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { Gallery } from './components/Gallery';
import { useTurtle } from './hooks/useTurtle';
import { EXAMPLES } from './examples';

// Tauri detection
const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriSave(filename: string, content: string | Uint8Array) {
  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeFile, writeTextFile } = await import('@tauri-apps/plugin-fs');
  const path = await save({ defaultPath: filename });
  if (!path) return;
  if (typeof content === 'string') await writeTextFile(path, content);
  else await writeFile(path, content);
}

async function tauriOpen(): Promise<string | null> {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const { readTextFile } = await import('@tauri-apps/plugin-fs');
  const path = await open({ filters: [{ name: 'Logo', extensions: ['logo', 'txt'] }] });
  if (!path || Array.isArray(path)) return null;
  return readTextFile(path);
}

function browserDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function browserDownloadDataURL(filename: string, dataUrl: string) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename; a.click();
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [penColor, setPenColor] = useState('#00ff00');
  const [penWidth, setPenWidth] = useState(2);
  const turtle    = useTurtle(canvasRef, { penColor, penWidth });

  const [code, setCode]        = useState(EXAMPLES[0].code);
  const [speedLabel, setSpeedLabel] = useState('4×');
  const fileInputRef           = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F5') { e.preventDefault(); turtle.run(code); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [code, turtle]);

  const handleRun  = useCallback(() => turtle.run(code),  [code, turtle]);
  const handleStep = useCallback(() => turtle.step(code), [code, turtle]);

  const handleSpeedChange = useCallback((label: string, spf: number, msDelay = 0) => {
    setSpeedLabel(label);
    turtle.setSpeed(spf, msDelay);
  }, [turtle]);

  const handleSave = useCallback(async () => {
    if (isTauri()) await tauriSave('program.logo', code);
    else browserDownload('program.logo', code, 'text/plain');
  }, [code]);

  const handleLoad = useCallback(async () => {
    if (isTauri()) {
      const text = await tauriOpen();
      if (text !== null) setCode(text);
    } else {
      fileInputRef.current?.click();
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) setCode(ev.target.result as string); };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleExportPNG = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    if (isTauri()) {
      const base64 = dataUrl.split(',')[1];
      const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      await tauriSave('turtle.png', bytes);
    } else {
      browserDownloadDataURL('turtle.png', dataUrl);
    }
  }, []);

  const handleExportSVG = useCallback(async () => {
    const renderer = turtle.getRenderer();
    if (!renderer) return;
    const svg = renderer.exportSVG();
    if (isTauri()) await tauriSave('turtle.svg', svg);
    else browserDownload('turtle.svg', svg, 'image/svg+xml');
  }, [turtle]);

  return (
    <div style={styles.root}>
      <Toolbar
        status={turtle.status}
        onRun={handleRun}
        onStop={turtle.stop}
        onStep={handleStep}
        onClear={turtle.clear}
        onSpeedChange={handleSpeedChange}
        speed={speedLabel}
        penColor={penColor}
        penWidth={penWidth}
        onPenColorChange={setPenColor}
        onPenWidthChange={setPenWidth}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onSave={handleSave}
        onLoad={handleLoad}
      />
      <div style={styles.body}>
        <Gallery onSelect={setCode} />
        <div style={styles.editorPane}>
          <Editor value={code} onChange={setCode} />
          {(turtle.error || turtle.logs.length > 0) && (
            <div style={styles.console}>
              {turtle.error && <div style={{ color: '#f38ba8' }}>⚠ {turtle.error}</div>}
              {turtle.logs.map((l, i) => <div key={i} style={{ color: '#a6e3a1' }}>{l}</div>)}
            </div>
          )}
        </div>
        <div style={styles.canvasPane}>
          <CanvasContainer canvasRef={canvasRef} turtleState={turtle.turtleState} />
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".logo,.txt" style={{ display: 'none' }} onChange={handleFileInput} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex', flexDirection: 'column',
    width: '100vw', height: '100vh',
    background: '#1e1e2e', color: '#cdd6f4',
    fontFamily: 'system-ui, sans-serif',
    overflow: 'hidden',
  },
  body: {
    display: 'flex', flex: 1, overflow: 'hidden',
  },
  editorPane: {
    display: 'flex', flexDirection: 'column',
    width: '40%', minWidth: 280,
    borderRight: '1px solid #2a2a3c',
    overflow: 'hidden',
  },
  canvasPane: {
    flex: 1, overflow: 'hidden',
  },
  console: {
    background: '#181825', borderTop: '1px solid #2a2a3c',
    padding: '6px 10px', fontSize: 12, fontFamily: 'monospace',
    maxHeight: 120, overflowY: 'auto',
  },
};
