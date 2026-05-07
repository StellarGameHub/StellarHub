import { ipcMain, dialog } from 'electron';

export function registerDialogHandlers() {
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });
}