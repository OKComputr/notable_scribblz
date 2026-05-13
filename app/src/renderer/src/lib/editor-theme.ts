import { EditorView } from '@codemirror/view';

// Bridge CodeMirror's styling to our CSS variables so theme switches Just Work.
export function notableTheme(): ReturnType<typeof EditorView.theme> {
  return EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '15px',
      color: 'var(--color-fg)',
      background: 'var(--color-main)',
      fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    '.cm-scroller': {
      fontFamily: 'inherit',
      lineHeight: '1.65',
      padding: '24px 64px 96px'
    },
    '.cm-content': {
      caretColor: 'var(--color-accent)',
      maxWidth: '780px',
      margin: '0 auto'
    },
    '.cm-cursor': { borderLeftColor: 'var(--color-accent)', borderLeftWidth: '2px' },
    '.cm-selectionBackground, .cm-content ::selection': {
      background: 'var(--color-selected) !important'
    },
    '.cm-activeLine': { background: 'transparent' },
    '.cm-line':       { padding: '0 2px' },
    '.cm-gutters':    { display: 'none' }
  }, { dark: false });   // we let CSS variables handle dark mode
}
