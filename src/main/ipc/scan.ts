import { ipcMain } from 'electron';
import { getScanConfigs, saveScanConfig, deleteScanConfig, updateScanDate } from '../services/scanConfigService';
import { runScan } from '../services/romScannerService'; // lo implementaremos luego

export function registerScanHandlers() {
  ipcMain.handle('get-scan-configs', async () => {
    return await getScanConfigs();
  });

  ipcMain.handle('save-scan-config', async (_, config) => {
    await saveScanConfig(config);
    return { success: true };
  });

  ipcMain.handle('delete-scan-config', async (_, id) => {
    const deleted = await deleteScanConfig(id);
    return { success: deleted };
  });

  ipcMain.handle('run-scan', async (_, configId: string) => {
    const configs = await getScanConfigs();
    const config = configs.find(c => c.id === configId);
    if (!config) throw new Error(`Configuración ${configId} no encontrada`);
    const result = await runScan(config);
    await updateScanDate(configId, new Date());
    return result;
  });
}