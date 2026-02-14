const { app, BrowserWindow, nativeTheme, ipcMain, screen, globalShortcut, dialog } = require('electron');
const path = require('path');
const { createTray, getTray } = require('./tray');
const { registerIpcHandlers } = require('./ipc-handlers');
const { Store } = require('./store');
const { AsanaAPI } = require('./asana-api');
const { autoUpdater } = require('electron-updater');
const { THEME_BG_COLORS, WINDOW_SIZE, SETTINGS_WINDOW_SIZE, UPDATE_DIALOG_SIZE, TIMING, DEFAULT_SETTINGS } = require('./constants');

const isDev = process.argv.includes('--dev');

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLING
// ══════════════════════════════════════════════════════════════════════════════

process.on('uncaughtException', (error) => {
  if (error.code === 'EPIPE' || error.message?.includes('EPIPE')) return;
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ══════════════════════════════════════════════════════════════════════════════

let mainWindow = null;
let settingsWindow = null;
let updateDialogWindow = null;
let store = null;
let asanaApi = null;
let tray = null;

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-UPDATER
// ══════════════════════════════════════════════════════════════════════════════

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let isManualUpdateCheck = false;
let isRestartingForUpdate = false;
let downloadProgressWindow = null;

function formatReleaseNotes(info) {
  if (!info.releaseNotes) return '';
  if (typeof info.releaseNotes === 'string') return info.releaseNotes;
  if (Array.isArray(info.releaseNotes)) {
    return info.releaseNotes.map(n => n.note || n).join('\n\n');
  }
  return '';
}

function destroyProgressWindow() {
  if (downloadProgressWindow && !downloadProgressWindow.isDestroyed()) {
    downloadProgressWindow.destroy();
    downloadProgressWindow = null;
  }
}

function showUpdateDialog(mode, options) {
  if (updateDialogWindow && !updateDialogWindow.isDestroyed()) {
    updateDialogWindow.close();
  }

  const theme = resolveTheme();
  updateDialogWindow = new BrowserWindow({
    width: UPDATE_DIALOG_SIZE.WIDTH,
    height: UPDATE_DIALOG_SIZE.HEIGHT,
    alwaysOnTop: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false,
    backgroundColor: THEME_BG_COLORS[theme],
    webPreferences: {
      preload: path.join(__dirname, 'update-dialog-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Store init data for the dialog
  updateDialogWindow._initData = {
    mode,
    currentVersion: options.currentVersion || app.getVersion(),
    newVersion: options.newVersion || '',
    releaseNotes: options.releaseNotes || '',
    theme
  };

  const url = isDev
    ? 'http://localhost:5173/src/update-dialog/index.html'
    : `file://${path.join(__dirname, '../../dist-renderer/src/update-dialog/index.html')}`;

  updateDialogWindow.loadURL(url);

  updateDialogWindow.on('closed', () => {
    updateDialogWindow = null;
  });
}

autoUpdater.on('update-available', (info) => {
  isManualUpdateCheck = false;
  showUpdateDialog('update-available', {
    newVersion: info.version,
    releaseNotes: formatReleaseNotes(info)
  });
});

autoUpdater.on('update-not-available', () => {
  if (isManualUpdateCheck) {
    isManualUpdateCheck = false;
    dialog.showMessageBox({
      type: 'info',
      title: 'No Updates Available',
      message: 'You\'re running the latest version.',
      buttons: ['OK']
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  destroyProgressWindow();
  const releaseNotes = formatReleaseNotes(info);
  if (store && releaseNotes) {
    store.setSettings({ pendingWhatsNewNotes: releaseNotes });
  }
  showUpdateDialog('update-downloaded', {
    newVersion: info.version,
    releaseNotes
  });
});

autoUpdater.on('download-progress', (progress) => {
  const percent = Math.round(progress.percent);

  if (!downloadProgressWindow || downloadProgressWindow.isDestroyed()) {
    let x, y;
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      x = bounds.x + Math.round((bounds.width - 280) / 2);
      y = bounds.y + bounds.height + 10;
    }

    downloadProgressWindow = new BrowserWindow({
      width: 280,
      height: 70,
      x, y,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      skipTaskbar: true,
      show: false,
      backgroundColor: '#1a1d23',
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
    });

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#1a1d23;color:#fff;font-family:-apple-system,system-ui,sans-serif;font-size:13px;">
      <div style="margin-bottom:8px;">Downloading update...</div>
      <div style="background:#2a2d33;border-radius:4px;overflow:hidden;height:6px;">
        <div id="bar" style="background:#3b82f6;height:100%;width:0%;transition:width 0.15s;"></div>
      </div>
      <div id="pct" style="margin-top:6px;font-size:11px;color:#888;">0%</div>
    </body></html>`;
    downloadProgressWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    downloadProgressWindow.once('ready-to-show', () => {
      if (downloadProgressWindow && !downloadProgressWindow.isDestroyed()) downloadProgressWindow.show();
    });
  }

  if (downloadProgressWindow && !downloadProgressWindow.isDestroyed() && downloadProgressWindow.webContents) {
    downloadProgressWindow.webContents.executeJavaScript(`
      if (document.getElementById('bar')) {
        document.getElementById('bar').style.width = '${percent}%';
        document.getElementById('pct').textContent = '${percent}%';
      }
    `).catch(() => {});
  }
});

autoUpdater.on('error', (err) => {
  destroyProgressWindow();
  if (!isDev) {
    console.error('Auto-updater error:', err);
    if (isManualUpdateCheck || err.message?.includes('download')) {
      isManualUpdateCheck = false;
      dialog.showMessageBox({
        type: 'error',
        title: 'Update Error',
        message: 'Failed to check for updates.',
        detail: err.message || 'Please try again later.',
        buttons: ['OK']
      });
    }
  }
});

// ── Update IPC handlers ───────────────────────────────────────

ipcMain.handle('update-dialog:get-init-data', () => {
  if (updateDialogWindow && updateDialogWindow._initData) {
    return updateDialogWindow._initData;
  }
  return null;
});

ipcMain.handle('app:check-for-updates', () => {
  isManualUpdateCheck = true;
  autoUpdater.checkForUpdates().catch(err => {
    console.error('[main] Update check failed:', err.message);
  });
});

ipcMain.handle('app:download-update', () => {
  autoUpdater.downloadUpdate().catch(err => {
    console.error('[main] Download update failed:', err.message);
  });
});

ipcMain.handle('app:restart-for-update', () => {
  isRestartingForUpdate = true;
  const trayRef = getTray();
  if (trayRef) trayRef.destroy();
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.on('update-dialog:close', () => {
  if (updateDialogWindow && !updateDialogWindow.isDestroyed()) {
    updateDialogWindow.close();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════════════════════════════════════

function resolveTheme() {
  const settings = store ? store.getSettings() : {};
  const themeSetting = settings.theme || 'system';
  if (themeSetting === 'system') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  }
  return themeSetting;
}

function broadcastTheme(theme) {
  const windows = [mainWindow, settingsWindow, updateDialogWindow];
  for (const win of windows) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('theme:changed', theme);
    }
  }
}

function broadcastAccent(accent) {
  const windows = [mainWindow, settingsWindow];
  for (const win of windows) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('accent:changed', accent);
    }
  }
}

ipcMain.on('app:apply-theme', (_, theme) => {
  if (store) store.setSettings({ theme });
  broadcastTheme(resolveTheme());
});

ipcMain.on('app:apply-accent', (_, accent) => {
  if (store) store.setSettings({ accentColor: accent });
  broadcastAccent(accent);
});

nativeTheme.on('updated', () => {
  const settings = store ? store.getSettings() : {};
  if (settings.theme === 'system') {
    broadcastTheme(resolveTheme());
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// WINDOW MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

function createMainWindow() {
  const settings = store.getSettings();
  const theme = resolveTheme();

  // Restore saved bounds or use defaults
  let bounds = settings.windowBounds || {
    width: WINDOW_SIZE.DEFAULT_WIDTH,
    height: WINDOW_SIZE.DEFAULT_HEIGHT
  };

  // Validate bounds are on a visible display
  if (bounds.x !== undefined && bounds.y !== undefined) {
    const displays = screen.getAllDisplays();
    const onScreen = displays.some(d => {
      const area = d.workArea;
      return bounds.x >= area.x - 50 && bounds.x < area.x + area.width &&
             bounds.y >= area.y - 50 && bounds.y < area.y + area.height;
    });
    if (!onScreen) {
      delete bounds.x;
      delete bounds.y;
    }
  }

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: WINDOW_SIZE.MIN_WIDTH,
    minHeight: WINDOW_SIZE.MIN_HEIGHT,
    maxWidth: WINDOW_SIZE.MAX_WIDTH,
    alwaysOnTop: true,
    frame: false,
    backgroundColor: THEME_BG_COLORS[theme],
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const url = isDev
    ? 'http://localhost:5173/src/renderer/index.html'
    : `file://${path.join(__dirname, '../../dist-renderer/src/renderer/index.html')}`;

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Save window bounds on move/resize
  let boundsTimer = null;
  const saveBounds = () => {
    if (boundsTimer) clearTimeout(boundsTimer);
    boundsTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        store.setSettings({ windowBounds: mainWindow.getBounds() });
      }
    }, TIMING.SAVE_DEBOUNCE_MS);
  };
  mainWindow.on('move', saveBounds);
  mainWindow.on('resize', saveBounds);

  // Hide instead of close
  mainWindow.on('close', (e) => {
    if (!isRestartingForUpdate && !app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function hideMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
}

function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  const theme = resolveTheme();
  settingsWindow = new BrowserWindow({
    width: SETTINGS_WINDOW_SIZE.WIDTH,
    height: SETTINGS_WINDOW_SIZE.HEIGHT,
    alwaysOnTop: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false,
    backgroundColor: THEME_BG_COLORS[theme],
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'settings-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const url = isDev
    ? 'http://localhost:5173/src/settings/index.html'
    : `file://${path.join(__dirname, '../../dist-renderer/src/settings/index.html')}`;

  settingsWindow.loadURL(url);

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
    // Trigger a fresh poll after settings change (re-applies filters server-side)
    if (asanaApi) {
      asanaApi.refresh();
    }
  });
}

// Handle settings open from both renderer and tray
ipcMain.on('window:open-settings', () => {
  openSettings();
});

// Re-register global hotkey when changed in settings
ipcMain.on('app:re-register-hotkey', () => {
  registerGlobalHotkey();
});

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL HOTKEY
// ══════════════════════════════════════════════════════════════════════════════

let currentHotkey = null;

function registerGlobalHotkey() {
  const settings = store.getSettings();
  const hotkey = settings.globalHotkey || DEFAULT_SETTINGS.globalHotkey;

  // Unregister previous hotkey
  if (currentHotkey) {
    try { globalShortcut.unregister(currentHotkey); } catch (e) {}
  }

  try {
    globalShortcut.register(hotkey, () => {
      if (mainWindow.isVisible()) {
        hideMainWindow();
      } else {
        showMainWindow();
      }
    });
    currentHotkey = hotkey;
  } catch (err) {
    console.error('[main] Failed to register hotkey:', err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// APP LIFECYCLE
// ══════════════════════════════════════════════════════════════════════════════

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });
}

app.on('before-quit', () => {
  app.isQuitting = true;
});

ipcMain.on('app:quit', () => {
  app.isQuitting = true;
  app.quit();
});

app.whenReady().then(() => {
  // Hide from dock (tray-only app)
  if (app.dock) {
    app.dock.hide();
  }

  // Initialize store
  store = new Store();

  // Apply default settings for any missing values
  const currentSettings = store.getSettings();
  const mergedSettings = { ...DEFAULT_SETTINGS, ...currentSettings };
  store.setSettings(mergedSettings);

  // Initialize Asana API
  asanaApi = new AsanaAPI({
    store,
    getApiKey: () => {
      const settings = store.getSettings();
      return settings.apiKey ? store.decryptApiKey(settings.apiKey) : null;
    }
  });

  // Register IPC handlers
  registerIpcHandlers({
    store,
    asanaApi,
    getMainWindow: () => mainWindow,
    getSettingsWindow: () => settingsWindow
  });

  // Create main window
  createMainWindow();

  // Create tray
  tray = createTray(mainWindow, showMainWindow, hideMainWindow, openSettings);

  // Register global hotkey
  registerGlobalHotkey();

  // Start polling if API key is verified
  const settings = store.getSettings();
  if (settings.apiKeyVerified && settings.apiKey) {
    asanaApi.startPolling(
      settings.pollIntervalMinutes || TIMING.DEFAULT_POLL_INTERVAL_MINUTES,
      (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('asana:data-updated', data);
        }
      },
      () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('asana:poll-started');
        }
      }
    );
  }

  // Check for updates (after brief delay)
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, TIMING.INITIAL_UPDATE_DELAY_MS);

    // Periodic update checks
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, TIMING.UPDATE_CHECK_INTERVAL_MS);
  }

  // Show "What's New" if pending
  if (settings.pendingWhatsNewNotes) {
    showUpdateDialog('whats-new', {
      releaseNotes: settings.pendingWhatsNewNotes
    });
    store.setSettings({ pendingWhatsNewNotes: null });
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (store) store.flush();
});

app.on('window-all-closed', (e) => {
  // Don't quit on window close - we're a tray app
  e.preventDefault?.();
});
