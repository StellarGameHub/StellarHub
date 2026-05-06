import { ipcMain } from 'electron';
import { getProtonVersions } from '../services/protonService';

export function registerProtonHandlers() {
  ipcMain.handle('get-proton-versions', async () => {
    try {
      const versions = await getProtonVersions();
      return { success: true, versions };
    } catch (error) {
      console.error('Failed to get Proton versions:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}