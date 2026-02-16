import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import path from 'path';

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM TRAY
// ══════════════════════════════════════════════════════════════════════════════

let trayInstance: Tray | null = null;

interface TrayDeps {
  mainWindow: BrowserWindow;
  showMainWindow: () => void;
  hideMainWindow: () => void;
  openSettings: () => void;
}

let trayDeps: TrayDeps | null = null;

export function createTray(
  mainWindow: BrowserWindow,
  showMainWindow: () => void,
  hideMainWindow: () => void,
  openSettings: () => void
): Tray {
  const iconPath = path.join(__dirname, '../../build/trayIconTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);

  const tray = new Tray(icon);
  trayInstance = tray;
  tray.setToolTip('Panoptisana');

  trayDeps = { mainWindow, showMainWindow, hideMainWindow, openSettings };

  // Left click toggles window visibility
  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
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

function buildTrayMenu(): Menu {
  if (!trayDeps) {
    return Menu.buildFromTemplate([{ label: 'Panoptisana not ready', enabled: false }]);
  }

  const { mainWindow, showMainWindow, hideMainWindow, openSettings } = trayDeps;
  if (!mainWindow || mainWindow.isDestroyed()) {
    return Menu.buildFromTemplate([{ label: 'Panoptisana not ready', enabled: false }]);
  }
  const menuItems: Electron.MenuItemConstructorOptions[] = [];

  menuItems.push({
    label: mainWindow.isVisible() ? 'Hide Panoptisana' : 'Show Panoptisana',
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
    label: 'Quit Panoptisana',
    click: () => {
      app.quit();
    }
  });

  return Menu.buildFromTemplate(menuItems);
}

export function getTray(): Tray | null {
  return trayInstance;
}
