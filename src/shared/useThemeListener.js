import { useEffect } from 'react';

/**
 * Hook to subscribe to theme and accent changes from the main process.
 * Shared between all renderer entry points.
 *
 * @param {Object} api - The window API object (electronAPI, settingsAPI, or updateAPI)
 */
export function useThemeListener(api) {
  useEffect(() => {
    if (!api?.onThemeChanged) return;

    const unsubTheme = api.onThemeChanged((theme) => {
      document.documentElement.classList.add('theme-transitioning');
      document.documentElement.dataset.theme = theme;
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('theme-transitioning');
      });
    });

    const unsubAccent = api.onAccentChanged
      ? api.onAccentChanged((accent) => {
          document.documentElement.dataset.accent = accent;
        })
      : null;

    return () => {
      unsubTheme();
      if (unsubAccent) unsubAccent();
    };
  }, [api]);
}
