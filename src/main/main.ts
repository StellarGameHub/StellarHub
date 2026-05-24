import { app, BrowserWindow, ipcMain, net, protocol } from 'electron';
import { registerGameHandlers } from './ipc/games';
import { registerProtonHandlers } from './ipc/proton';
import { registerSettingsHandlers } from './ipc/settings';
import { registerImageHandlers } from './ipc/images';

import path from 'path';
import { registerCategoriesHandlers } from './ipc/categories';
import { registerDialogHandlers } from './ipc/dialogs';
import { registerRomScanHandlers } from './ipc/roms';
import { registerSteamHandlers } from './ipc/steam';
import { runAutoScans } from './services/autoScanService';


function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  //Hide Browser Menu
  win.setMenu(null);

  // En desarrollo, carga el servidor de Vite
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();

    // console.log("Lanzando en modo test")
    // app.setPath('userData', app.getPath('userData') + '-test');
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}


app.whenReady().then(() => {
  console.log('⚡ Backend iniciado correctamente');

  // Protocol to serve image from relative path
  protocol.handle('stellarhub', (request) => {
    const url = new URL(request.url);
    // url.pathname será algo como "/images/grid/abc.png"
    const filePath = path.join(app.getPath('userData'), "images", decodeURIComponent(url.pathname));
    console.log(`Serving image from path: ${filePath}`);
    return net.fetch('file://' + filePath);
  });

  registerSteamHandlers();
  registerRomScanHandlers();
  registerDialogHandlers();
  registerCategoriesHandlers();
  registerSettingsHandlers();
  registerGameHandlers();
  registerProtonHandlers();
  registerImageHandlers();

  //MOSTRAR LA VENTANA
  createWindow();

  //AUTOSCAN DE JUEGOS
  runAutoScans().catch(err => console.error('AutoScan error:', err));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('app-quit', () => {
  app.quit();
});

ipcMain.handle('is-maximized', () => {
  const win = BrowserWindow.getFocusedWindow();
  return win?.isMaximized() ?? false;
});

ipcMain.handle('toggle-maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});