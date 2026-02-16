import type { ElectronAPI, SettingsAPI, UpdateAPI } from './types';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    settingsAPI: SettingsAPI;
    updateAPI: UpdateAPI;
  }
}
