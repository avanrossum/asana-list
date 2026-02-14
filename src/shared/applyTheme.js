/**
 * Apply theme and accent to the document root element.
 * Shared between all renderer entry points.
 *
 * @param {Object} settings - Settings object with theme and accentColor
 */
export function applyTheme(settings) {
  const theme = settings.theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : settings.theme;
  document.documentElement.dataset.theme = theme || 'dark';

  if (settings.accentColor) {
    document.documentElement.dataset.accent = settings.accentColor;
  }
}
