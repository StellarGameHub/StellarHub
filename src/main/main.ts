import { app, BrowserWindow } from 'electron';
import { registerGameHandlers } from './ipc/games';
import { registerProtonHandlers } from './ipc/proton';
import { registerSettingsHandlers } from './ipc/settings';
import { registerImageHandlers } from './ipc/images';

import path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // En desarrollo, carga el servidor de Vite
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerSettingsHandlers();
  registerGameHandlers();
  registerProtonHandlers();
  registerImageHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});