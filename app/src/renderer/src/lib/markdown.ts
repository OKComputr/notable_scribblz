import MarkdownIt from 'markdown-it';
import mdAnchor from 'markdown-it-anchor';
import mdTaskLists from 'markdown-it-task-lists';
import katex from 'katex';
import Prism from 'prismjs';
import mermaid from 'mermaid';
import { ATTACHMENT_TOKEN, IMAGE_EXTS } from '@shared/types';

import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });

function highlight(code: string, lang: string): string {
  const grammar = (Prism.languages as Record<string, Prism.Grammar>)[lang];
  if (!grammar) {
    return escape(code);
  }
  return Prism.highlight(code, grammar, lang);
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isImageAttachment(href: string): boolean {
  if (!href.startsWith(`${ATTACHMENT_TOKEN}/`)) return false;
  const file = href.slice(ATTACHMENT_TOKEN.length + 1);
  const dot = file.lastIndexOf('.');
  if (dot < 0) return false;
  const ext = file.slice(dot + 1).toLowerCase().split(/[?#]/)[0];
  return IMAGE_EXTS.has(ext);
}

function attachmentUrl(href: string): string {
  // Strip the token prefix; the renderer will use the custom `attachment://`
  // protocol to fetch the file from the workspace's attachments dir.
  const fileName = href.slice(ATTACHMENT_TOKEN.length + 1);
  return `attachment:///${encodeURI(fileName)}`;
}

function createMarkdown(): MarkdownIt {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: false,
    typographer: false,
    highlight: (code, lang) => {
      if (lang === 'mermaid') {
        // Defer mermaid rendering to the renderer component (it needs DOM).
        return `<div class="mermaid">${escape(code)}</div>`;
      }
      return `<pre class="language-${lang || 'text'}"><code class="language-${lang || 'text'}">${highlight(code, lang || '')}</code></pre>`;
    }
  });

  md.use(mdAnchor, { permalink: false });
  md.use(mdTaskLists, { enabled: true, label: true });

  // ----- Inline math: $...$ and $$...$$ -----
  md.inline.ruler.after('escape', 'math_inline', (state, silent) => {
    const start = state.pos;
    if (state.src[start] !== '$') return false;
    // Detect $$...$$ blocks first
    const isBlock = state.src[start + 1] === '$';
    const open = isBlock ? '$$' : '$';
    const end = state.src.indexOf(open, start + open.length);
    if (end < 0) return false;
    const content = state.src.slice(start + open.length, end);
    if (!content.trim()) return false;
    if (!silent) {
      const token = state.push(isBlock ? 'math_block' : 'math_inline', 'math', 0);
      token.markup = open;
      token.content = content;
    }
    state.pos = end + open.length;
    return true;
  });
  md.renderer.rules.math_inline = (tokens, idx) => {
    try { return katex.renderToString(tokens[idx].content, { throwOnError: false, displayMode: false }); }
    catch { return `<code>${escape(tokens[idx].content)}</code>`; }
  };
  md.renderer.rules.math_block = (tokens, idx) => {
    try { return `<div class="math-block">${katex.renderToString(tokens[idx].content, { throwOnError: false, displayMode: true })}</div>`; }
    catch { return `<pre>${escape(tokens[idx].content)}</pre>`; }
  };

  // ----- Image attachments inline + paperclip links for non-images -----
  const defaultLinkOpen  = md.renderer.rules.link_open  ?? ((tokens, idx, opts, _e, self) => self.renderToken(tokens, idx, opts));
  const defaultLinkClose = md.renderer.rules.link_close ?? ((tokens, idx, opts, _e, self) => self.renderToken(tokens, idx, opts));
  const defaultImage     = md.renderer.rules.image      ?? ((tokens, idx, opts, _e, self) => self.renderToken(tokens, idx, opts));

  md.renderer.rules.image = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const hrefIdx = token.attrIndex('src');
    if (hrefIdx >= 0 && token.attrs) {
      const href = token.attrs[hrefIdx][1];
      if (href.startsWith(`${ATTACHMENT_TOKEN}/`)) {
        const url = attachmentUrl(href);
        token.attrs[hrefIdx][1] = url;
        token.attrSet('class', 'attachment');
        token.attrSet('data-filename', href.slice(ATTACHMENT_TOKEN.length + 1));
      }
    }
    return defaultImage(tokens, idx, opts, env, self);
  };

  // Track [name](@attachment/foo.png) link state so we can rewrite text
  // between link_open and link_close.
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const hrefIdx = token.attrIndex('href');
    if (hrefIdx < 0 || !token.attrs) return defaultLinkOpen(tokens, idx, opts, env, self);
    const href = token.attrs[hrefIdx][1];
    if (!href.startsWith(`${ATTACHMENT_TOKEN}/`)) {
      return defaultLinkOpen(tokens, idx, opts, env, self);
    }
    const fileName = href.slice(ATTACHMENT_TOKEN.length + 1);
    if (isImageAttachment(href)) {
      // Replace the whole [text](url) sequence with a single <img>.
      const close = findMatchingClose(tokens, idx);
      // Erase intervening text tokens
      for (let i = idx + 1; i < close; i++) tokens[i].type = 'text', tokens[i].content = '';
      tokens[close].type = 'text';
      tokens[close].content = '';
      return `<img src="${attachmentUrl(href)}" alt="${escape(fileName)}" class="attachment" data-filename="${escape(fileName)}" />`;
    }
    // Non-image: render as a styled paperclip link.
    token.attrs[hrefIdx][1] = attachmentUrl(href);
    token.attrSet('class', 'attachment-link');
    token.attrSet('data-filename', fileName);
    return defaultLinkOpen(tokens, idx, opts, env, self);
  };

  md.renderer.rules.link_close = (tokens, idx, opts, env, self) => {
    return defaultLinkClose(tokens, idx, opts, env, self);
  };

  return md;
}

function findMatchingClose(tokens: ReturnType<MarkdownIt['parse']>, openIdx: number): number {
  let depth = 1;
  for (let i = openIdx + 1; i < tokens.length; i++) {
    if (tokens[i].type === 'link_open')  depth++;
    if (tokens[i].type === 'link_close') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return tokens.length - 1;
}

const md = createMarkdown();

export function renderMarkdown(source: string): string {
  return md.render(source);
}

let mermaidCounter = 0;
export async function postProcessMermaid(root: HTMLElement): Promise<void> {
  const blocks = root.querySelectorAll('.mermaid');
  for (const el of Array.from(blocks)) {
    const source = el.textContent ?? '';
    const id = `mmd-${++mermaidCounter}`;
    try {
      const { svg } = await mermaid.render(id, source);
      el.innerHTML = svg;
    } catch (err) {
      el.innerHTML = `<pre style="color:#c0392b">Mermaid error: ${escape((err as Error).message)}</pre>`;
    }
  }
}
