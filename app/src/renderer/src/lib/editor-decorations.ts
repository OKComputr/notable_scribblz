import { syntaxTree } from '@codemirror/language';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
  WidgetType
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { ATTACHMENT_TOKEN, IMAGE_EXTS } from '@shared/types';

// ---------- Image widget ----------

class ImageWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string) { super(); }
  override eq(other: ImageWidget): boolean { return other.src === this.src && other.alt === this.alt; }
  toDOM(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cm-image-block';
    const img = document.createElement('img');
    img.className = 'cm-image-attachment';
    img.alt = this.alt;
    img.src = this.src;
    img.draggable = false;
    img.onerror = (): void => {
      wrap.classList.add('cm-image-error');
      wrap.textContent = `⚠ couldn't load ${this.alt}`;
    };
    wrap.appendChild(img);
    return wrap;
  }
  override ignoreEvent(): boolean { return false; }
}

function attachmentUrl(href: string): string | null {
  if (!href.startsWith(`${ATTACHMENT_TOKEN}/`)) return null;
  const fileName = href.slice(ATTACHMENT_TOKEN.length + 1);
  return `attachment:///${encodeURI(fileName)}`;
}

function isImageHref(href: string): boolean {
  const dot = href.lastIndexOf('.');
  if (dot < 0) return false;
  const ext = href.slice(dot + 1).toLowerCase().split(/[?#]/)[0];
  return IMAGE_EXTS.has(ext);
}

// ---------- Decoration builder ----------

// Each markdown construct gets a CSS class — the actual styling lives in
// globals.css so it can use our --color-* CSS variables.
const HEADING_CLASS: Record<number, string> = {
  1: 'cm-h1',
  2: 'cm-h2',
  3: 'cm-h3',
  4: 'cm-h4',
  5: 'cm-h5',
  6: 'cm-h6'
};

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const lineWidgets: { pos: number; widget: Decoration }[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter(node) {
        const { type, from: nFrom, to: nTo } = node;

        // ---- Line-level decorations (headings, blockquotes, code blocks) ----
        if (type.name.startsWith('ATXHeading')) {
          const level = parseInt(type.name.slice('ATXHeading'.length), 10);
          const klass = HEADING_CLASS[level];
          if (klass) {
            builder.add(view.state.doc.lineAt(nFrom).from, view.state.doc.lineAt(nFrom).from,
              Decoration.line({ class: `cm-md-heading ${klass}` }));
          }
        }
        if (type.name === 'Blockquote') {
          let lineStart = nFrom;
          while (lineStart < nTo) {
            const line = view.state.doc.lineAt(lineStart);
            builder.add(line.from, line.from, Decoration.line({ class: 'cm-md-blockquote' }));
            lineStart = line.to + 1;
          }
        }
        if (type.name === 'FencedCode' || type.name === 'CodeBlock') {
          let lineStart = nFrom;
          while (lineStart < nTo) {
            const line = view.state.doc.lineAt(lineStart);
            builder.add(line.from, line.from, Decoration.line({ class: 'cm-md-code-block' }));
            lineStart = line.to + 1;
          }
        }
        if (type.name === 'HorizontalRule') {
          const line = view.state.doc.lineAt(nFrom);
          builder.add(line.from, line.from, Decoration.line({ class: 'cm-md-hr' }));
        }

        // ---- Inline marks ----
        if (type.name === 'StrongEmphasis')   builder.add(nFrom, nTo, Decoration.mark({ class: 'cm-md-strong' }));
        if (type.name === 'Emphasis')         builder.add(nFrom, nTo, Decoration.mark({ class: 'cm-md-emphasis' }));
        if (type.name === 'Strikethrough')    builder.add(nFrom, nTo, Decoration.mark({ class: 'cm-md-strikethrough' }));
        if (type.name === 'InlineCode')       builder.add(nFrom, nTo, Decoration.mark({ class: 'cm-md-inline-code' }));
        if (type.name === 'Link')             builder.add(nFrom, nTo, Decoration.mark({ class: 'cm-md-link' }));
        if (type.name === 'Image') {
          builder.add(nFrom, nTo, Decoration.mark({ class: 'cm-md-image-syntax' }));
        }
        // De-emphasize the literal markdown markers (the * _ ` # etc.).
        if (
          type.name === 'HeaderMark' ||
          type.name === 'EmphasisMark' ||
          type.name === 'StrikethroughMark' ||
          type.name === 'CodeMark' ||
          type.name === 'QuoteMark' ||
          type.name === 'LinkMark' ||
          type.name === 'URL'
        ) {
          builder.add(nFrom, nTo, Decoration.mark({ class: 'cm-md-marker' }));
        }
      }
    });
  }

  // ---- Image preview widgets (added as a separate pass so we can read the URL) ----
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter(node) {
        if (node.type.name !== 'Image') return;
        // Image node text is `![alt](href)`. Find the URL token underneath.
        const text = view.state.doc.sliceString(node.from, node.to);
        const m = text.match(/^!\[([^\]]*)\]\(([^)\s]+)/);
        if (!m) return;
        const [, alt, href] = m;
        const src = attachmentUrl(href) ?? (isImageHref(href) ? href : null);
        if (!src) return;
        const line = view.state.doc.lineAt(node.to);
        lineWidgets.push({
          pos: line.to,
          widget: Decoration.widget({
            widget: new ImageWidget(src, alt),
            side: 1,
            block: true
          })
        });
      }
    });
  }

  // The builder must receive ranges in ascending order; merge in image widgets after.
  let decos = builder.finish();
  for (const w of lineWidgets) {
    decos = decos.update({ add: [w.widget.range(w.pos)], sort: true });
  }
  return decos;
}

// ---------- ViewPlugin ----------

class MarkdownDecorationsPlugin implements PluginValue {
  decorations: DecorationSet;
  constructor(view: EditorView) {
    this.decorations = buildDecorations(view);
  }
  update(update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = buildDecorations(update.view);
    }
  }
}

export const markdownLiveDecorations = ViewPlugin.fromClass(MarkdownDecorationsPlugin, {
  decorations: (v) => v.decorations
});
