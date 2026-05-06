import { ipcMain } from 'electron';
import { getSettings, saveSettings } from '../services/settingsService';

export function registerSettingsHandlers() {
  ipcMain.handle('get-settings', async () => {
    return await getSettings();
  });
  ipcMain.handle('save-settings', async (event, settings) => {
    await saveSettings(settings);
    return { success: true };
  });
}