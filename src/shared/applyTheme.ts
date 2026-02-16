/**
 * Apply theme and accent to the document root element.
 * Shared between all renderer entry points.
 */

import type { ThemeSetting, ResolvedTheme } from './types';

interface ThemeSettings {
  theme: ThemeSetting;
  accentColor?: string;
}

export function applyTheme(settings: ThemeSettings): void {
  const theme: ResolvedTheme = settings.theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : settings.theme;
  document.documentElement.dataset.theme = theme || 'dark';

  if (settings.accentColor) {
    document.documentElement.dataset.accent = settings.accentColor;
  }
}
