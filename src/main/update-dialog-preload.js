const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('updateAPI', {
  getInitData: () => ipcRenderer.invoke('update-dialog:get-init-data'),
  downloadUpdate: () => ipcRenderer.invoke('app:download-update'),
  restartForUpdate: () => ipcRenderer.invoke('app:restart-for-update'),
  close: () => ipcRenderer.send('update-dialog:close'),

  onThemeChanged: (callback) => {
    const handler = (_, theme) => callback(theme);
    ipcRenderer.on('theme:changed', handler);
    return () => ipcRenderer.removeListener('theme:changed', handler);
  }
});
