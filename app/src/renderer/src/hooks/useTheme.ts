import { useEffect } from 'react';
import { useStore } from '@renderer/store/app';

function preferDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(theme: 'light' | 'dark' | 'system'): void {
  const dark = theme === 'dark' || (theme === 'system' && preferDark());
  document.body.classList.toggle('theme-dark', dark);
  document.body.classList.toggle('theme-light', !dark);
  document.documentElement.classList.toggle('dark', dark);
}

export function useTheme(): void {
  const settings = useStore(s => s.settings);
  useEffect(() => {
    if (!settings) return;
    apply(settings.theme);
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (): void => apply('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings]);
}

export function toggleTheme(): void {
  const { settings, setSettings } = useStore.getState();
  if (!settings) return;
  const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
  const next = order[(order.indexOf(settings.theme) + 1) % order.length];
  setSettings({ ...settings, theme: next });
  window.notable.settings.update({ theme: next }).catch(console.error);
}
