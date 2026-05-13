import { useEffect, useMemo, useRef } from 'react';
import { postProcessMermaid, renderMarkdown } from '@renderer/lib/markdown';

type Props = { source: string; theme: 'light' | 'dark' };

export function Preview({ source }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const html = useMemo(() => renderMarkdown(source), [source]);

  useEffect(() => {
    if (!hostRef.current) return;
    hostRef.current.innerHTML = html;
    postProcessMermaid(hostRef.current).catch(console.error);
  }, [html]);

  return (
    <div
      className="markdown-body h-full overflow-y-auto px-8 py-6 scrollbar-thin"
      ref={hostRef}
      style={{ background: 'var(--color-main)' }}
    />
  );
}
