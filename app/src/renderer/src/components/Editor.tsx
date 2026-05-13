import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

// Minimal Monaco env — markdown doesn't need language workers, only the base.
(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker: () => new EditorWorker()
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  theme: 'light' | 'dark';
  wordWrap: 'off' | 'on' | 'bounded';
  fontSize: number;
  tabSize: number;
  showLineNumbers: boolean;
};

export function Editor({ value, onChange, theme, wordWrap, fontSize, tabSize, showLineNumbers }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;
    const editor = monaco.editor.create(hostRef.current, {
      value,
      language: 'markdown',
      theme: theme === 'dark' ? 'vs-dark' : 'vs',
      automaticLayout: true,
      fontSize,
      tabSize,
      wordWrap,
      wordWrapColumn: 100,
      minimap: { enabled: false },
      lineNumbers: showLineNumbers ? 'on' : 'off',
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      bracketPairColorization: { enabled: true },
      renderWhitespace: 'selection',
      padding: { top: 14, bottom: 14 },
      fontLigatures: true,
      cursorBlinking: 'smooth'
    });
    editor.onDidChangeModelContent(() => {
      onChangeRef.current(editor.getValue());
    });
    editorRef.current = editor;

    return () => {
      editor.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme switch
  useEffect(() => {
    monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
  }, [theme]);

  // Options switch (font/wrap/etc.) when settings change
  useEffect(() => {
    editorRef.current?.updateOptions({
      fontSize,
      tabSize,
      wordWrap,
      lineNumbers: showLineNumbers ? 'on' : 'off'
    });
  }, [fontSize, tabSize, wordWrap, showLineNumbers]);

  // External value sync (e.g., switching notes)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getValue() === value) return;
    const pos = editor.getPosition();
    editor.setValue(value);
    if (pos) editor.setPosition(pos);
  }, [value]);

  return <div ref={hostRef} className="h-full w-full" />;
}
