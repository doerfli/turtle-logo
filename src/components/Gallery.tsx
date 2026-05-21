import { EXAMPLES } from '../examples';

interface GalleryProps {
  onSelect: (code: string) => void;
}

export function Gallery({ onSelect }: GalleryProps) {
  return (
    <div style={styles.panel}>
      <div style={styles.heading}>Examples</div>
      {EXAMPLES.map(ex => (
        <button key={ex.name} style={styles.item} onClick={() => onSelect(ex.code)} title={ex.description}>
          {ex.name}
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: 8, background: '#16161e',
    borderRight: '1px solid #2a2a3c', minWidth: 130,
  },
  heading: {
    color: '#6c7086', fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 4, padding: '0 4px',
  },
  item: {
    background: 'none', color: '#cdd6f4',
    border: '1px solid #313244', borderRadius: 4,
    padding: '5px 8px', cursor: 'pointer', fontSize: 12,
    textAlign: 'left',
  },
};
