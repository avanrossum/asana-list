import { useEffect } from 'react';

import type { ResolvedTheme } from './types';

/**
 * Hook to subscribe to theme and accent changes from the main process.
 * Shared between all renderer entry points.
 *
 * Accepts any preload API object that has onThemeChanged and optionally
 * onAccentChanged — works with ElectronAPI, SettingsAPI, and UpdateAPI.
 */

interface ThemeListenerAPI {
  onThemeChanged?: (callback: (theme: ResolvedTheme) => void) => () => void;
  onAccentChanged?: (callback: (accent: string) => void) => () => void;
}

export function useThemeListener(api: ThemeListenerAPI | null | undefined): void {
  useEffect(() => {
    if (!api?.onThemeChanged) return;

    const unsubTheme = api.onThemeChanged((theme: ResolvedTheme) => {
      document.documentElement.classList.add('theme-transitioning');
      document.documentElement.dataset.theme = theme;
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('theme-transitioning');
      });
    });

    const unsubAccent = api.onAccentChanged
      ? api.onAccentChanged((accent: string) => {
          document.documentElement.dataset.accent = accent;
        })
      : null;

    return () => {
      unsubTheme();
      if (unsubAccent) unsubAccent();
    };
  }, [api]);
}
