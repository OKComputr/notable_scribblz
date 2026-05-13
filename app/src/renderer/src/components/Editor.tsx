import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  lineNumbers
} from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { bracketMatching, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { classHighlighter } from '@lezer/highlight';
import { markdownLiveDecorations } from '@renderer/lib/editor-decorations';
import { notableTheme } from '@renderer/lib/editor-theme';

type Props = {
  value: string;
  onChange: (v: string) => void;
  wordWrap: 'off' | 'on' | 'bounded';
  fontSize: number;
  showLineNumbers: boolean;
};

export function Editor({ value, onChange, wordWrap, fontSize, showLineNumbers }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const wrapCompartment    = useRef(new Compartment());
  const numbersCompartment = useRef(new Compartment());
  const fontCompartment    = useRef(new Compartment());

  useEffect(() => {
    if (!hostRef.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        drawSelection(),
        highlightSpecialChars(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        markdown({ base: markdownLanguage, addKeymap: true }),
        markdownLiveDecorations,
        syntaxHighlighting(classHighlighter),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          indentWithTab
        ]),
        notableTheme(),
        wrapCompartment.current.of(wordWrap === 'off' ? [] : EditorView.lineWrapping),
        numbersCompartment.current.of(showLineNumbers ? lineNumbers() : []),
        fontCompartment.current.of(
          EditorView.theme({ '&': { fontSize: `${fontSize}px` } })
        ),
        EditorView.updateListener.of((v) => {
          if (v.docChanged) onChangeRef.current(v.state.doc.toString());
        })
      ]
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value sync (switching notes)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      selection: { anchor: Math.min(view.state.selection.main.anchor, value.length) }
    });
  }, [value]);

  // Options reconfiguration
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: [
        wrapCompartment.current.reconfigure(wordWrap === 'off' ? [] : EditorView.lineWrapping),
        numbersCompartment.current.reconfigure(showLineNumbers ? lineNumbers() : []),
        fontCompartment.current.reconfigure(EditorView.theme({ '&': { fontSize: `${fontSize}px` } }))
      ]
    });
  }, [wordWrap, showLineNumbers, fontSize]);

  return <div ref={hostRef} className="h-full w-full overflow-auto scrollbar-thin" />;
}
