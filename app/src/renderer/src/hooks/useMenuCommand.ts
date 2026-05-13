import { useEffect } from 'react';

export type MenuCommand =
  | 'cmd:new-note'
  | 'cmd:open-data-folder'
  | 'cmd:attach'
  | 'cmd:export-pdf'
  | 'cmd:toggle-theme'
  | 'cmd:focus-search';

export function useMenuCommand(cmd: MenuCommand, handler: () => void): void {
  useEffect(() => {
    const h = (): void => handler();
    window.addEventListener(cmd, h);
    return () => window.removeEventListener(cmd, h);
  }, [cmd, handler]);
}
