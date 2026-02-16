import { contextBridge, ipcRenderer } from 'electron';

import type { UpdateAPI } from '../shared/types';

const updateAPI: UpdateAPI = {
  getInitData: () => ipcRenderer.invoke('update-dialog:get-init-data'),
  downloadUpdate: () => ipcRenderer.invoke('app:download-update'),
  restartForUpdate: () => ipcRenderer.invoke('app:restart-for-update'),
  close: () => ipcRenderer.send('update-dialog:close'),

  onThemeChanged: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, theme: unknown) => callback(theme as any);
    ipcRenderer.on('theme:changed', handler);
    return () => ipcRenderer.removeListener('theme:changed', handler);
  }
};

contextBridge.exposeInMainWorld('updateAPI', updateAPI);
