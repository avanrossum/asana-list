// ══════════════════════════════════════════════════════════════════════════════
// APPLICATION CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

import type { Settings, ResolvedTheme } from '../shared/types';

export const THEME_BG_COLORS: Record<ResolvedTheme, string> = {
  dark: '#1a1d23',
  light: '#f5f5f7'
} as const;

export const WINDOW_SIZE = {
  MIN_WIDTH: 380,
  MIN_HEIGHT: 500,
  DEFAULT_WIDTH: 420,
  DEFAULT_HEIGHT: 700,
  MAX_WIDTH: 600,
  MAX_HEIGHT: 10000
} as const;

export const SETTINGS_WINDOW_SIZE = {
  WIDTH: 520,
  HEIGHT: 640
} as const;

export const UPDATE_DIALOG_SIZE = {
  WIDTH: 460,
  HEIGHT: 400
} as const;

export const TIMING = {
  SAVE_DEBOUNCE_MS: 500,
  UPDATE_CHECK_INTERVAL_MS: 4 * 60 * 60 * 1000, // 4 hours
  INITIAL_UPDATE_DELAY_MS: 3000,
  DEFAULT_POLL_INTERVAL_MINUTES: 5
} as const;

export const DEFAULT_SETTINGS: Omit<Settings, 'apiKey' | 'apiKeyVerified' | 'windowBounds'> & {
  apiKey: null;
  apiKeyVerified: false;
  windowBounds: null;
} = {
  theme: 'system',
  accentColor: 'blue',
  pollIntervalMinutes: 5,
  globalHotkey: 'Ctrl+Shift+A',
  showOnlyMyTasks: false,
  currentUserId: null,
  selectedUserIds: [],
  excludedTaskGids: [],
  excludedTaskPatterns: [],
  excludedProjectGids: [],
  excludedProjectPatterns: [],
  includedTaskPatterns: [],
  includedProjectPatterns: [],
  pinnedTaskGids: [],
  pinnedProjectGids: [],
  openLinksIn: 'default',
  apiKey: null,
  apiKeyVerified: false,
  windowBounds: null
};
