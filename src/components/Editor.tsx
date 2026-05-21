import { useEffect, useRef, memo } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { StreamLanguage } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// ─── Logo Stream Language ──────────────────────────────────────────────────

const KEYWORDS = new Set([
  'FORWARD', 'FD', 'BACKWARD', 'BK', 'RIGHT', 'RT', 'LEFT', 'LT',
  'PENUP', 'PU', 'PENDOWN', 'PD', 'PENCOLOR', 'PC', 'PENWIDTH', 'PW',
  'SHOWTURTLE', 'ST', 'HIDETURTLE', 'HT', 'CLEARSCREEN', 'CS',
  'HOME', 'SETPOS', 'SETHEADING', 'SETH',
  'REPEAT', 'TO', 'END', 'IF', 'IFELSE', 'MAKE', 'STOP', 'PRINT',
  'NOT', 'AND', 'OR',
]);

const COLOR_NAMES = new Set([
  'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'cyan',
  'magenta', 'white', 'black', 'gray', 'grey', 'lime', 'gold', 'pink',
]);

const logoLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.match(/;.*/)) return 'comment';
    if (stream.match(/\s+/)) return null;
    if (stream.match(/:[a-zA-Z_][a-zA-Z0-9_]*/)) return 'variableName';
    if (stream.match(/"[a-zA-Z0-9_#]*/)) {
      const word = stream.current().slice(1).toLowerCase();
      if (COLOR_NAMES.has(word)) return 'string';
      return 'string';
    }
    if (stream.match(/[0-9]+(\.[0-9]+)?/)) return 'number';
    if (stream.match(/[+\-*/%=<>]/)) return 'operator';
    if (stream.match(/[\[\]()]/)) return 'bracket';
    if (stream.match(/[a-zA-Z_][a-zA-Z0-9_]*/)) {
      const word = stream.current().toUpperCase();
      if (KEYWORDS.has(word)) return 'keyword';
      return 'variableName2';
    }
    stream.next();
    return null;
  },
});

const logoHighlight = HighlightStyle.define([
  { tag: t.keyword,         color: '#c678dd', fontWeight: 'bold' },
  { tag: t.variableName,    color: '#e06c75' },
  { tag: t.name,            color: '#61afef' },
  { tag: t.number,          color: '#d19a66' },
  { tag: t.string,          color: '#98c379' },
  { tag: t.comment,         color: '#5c6370', fontStyle: 'italic' },
  { tag: t.operator,        color: '#56b6c2' },
  { tag: t.bracket,         color: '#abb2bf' },
]);

// ─── Editor Component ──────────────────────────────────────────────────────

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
}

const Editor = memo(function Editor({ value, onChange }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef      = useRef<EditorView | null>(null);
  const onChangeRef  = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        oneDark,
        lineNumbers(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        bracketMatching(),
        indentOnInput(),
        logoLanguage,
        syntaxHighlighting(logoHighlight),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.updateListener.of(update => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px' },
          '.cm-scroller': { overflow: 'auto', fontFamily: '"JetBrains Mono", "Fira Code", monospace' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes into editor (e.g. gallery selection)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
});

export default Editor;
