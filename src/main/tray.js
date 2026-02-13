const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM TRAY
// ══════════════════════════════════════════════════════════════════════════════

let trayInstance = null;
let trayDeps = null;

/**
 * Create the system tray icon and menu
 * @param {BrowserWindow} mainWindow
 * @param {Function} showMainWindow
 * @param {Function} hideMainWindow
 * @param {Function} openSettings
 */
function createTray(mainWindow, showMainWindow, hideMainWindow, openSettings) {
  const iconPath = path.join(__dirname, '../../build/trayIconTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);

  const tray = new Tray(icon);
  trayInstance = tray;
  tray.setToolTip('Panorasana');

  trayDeps = { mainWindow, showMainWindow, hideMainWindow, openSettings };

  // Left click toggles window visibility
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      hideMainWindow();
    } else {
      showMainWindow();
    }
  });

  // Right click shows context menu
  tray.on('right-click', () => {
    const contextMenu = buildTrayMenu();
    tray.popUpContextMenu(contextMenu);
  });

  return tray;
}

function buildTrayMenu() {
  if (!trayDeps) {
    return Menu.buildFromTemplate([{ label: 'Panorasana not ready', enabled: false }]);
  }

  const { mainWindow, showMainWindow, hideMainWindow, openSettings } = trayDeps;
  const menuItems = [];

  menuItems.push({
    label: mainWindow.isVisible() ? 'Hide Panorasana' : 'Show Panorasana',
    click: () => {
      if (mainWindow.isVisible()) {
        hideMainWindow();
      } else {
        showMainWindow();
      }
    }
  });

  menuItems.push({ type: 'separator' });

  menuItems.push({
    label: 'Settings...',
    click: () => {
      if (!mainWindow.isVisible()) {
        showMainWindow();
      }
      openSettings();
    }
  });

  menuItems.push({ type: 'separator' });

  menuItems.push({
    label: 'Quit Panorasana',
    click: () => {
      app.quit();
    }
  });

  return Menu.buildFromTemplate(menuItems);
}

function getTray() {
  return trayInstance;
}

module.exports = { createTray, getTray };
