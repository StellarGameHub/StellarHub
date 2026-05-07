import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { ScanConfig } from '../../shared/types';

const SCAN_CONFIGS_FILE = 'scan-configs.json';

function getConfigsPath(): string {
  return path.join(app.getPath('userData'), SCAN_CONFIGS_FILE);
}

// Obtener todas las configuraciones
export async function getScanConfigs(): Promise<ScanConfig[]> {
  const filePath = getConfigsPath();
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

// Guardar una configuración (nueva o existente)
export async function saveScanConfig(config: ScanConfig): Promise<void> {
  const configs = await getScanConfigs();
  const index = configs.findIndex(c => c.id === config.id);
  if (index >= 0) {
    configs[index] = config;
  } else {
    configs.push(config);
  }
  await writeConfigs(configs);
}

// Eliminar configuración por ID
export async function deleteScanConfig(id: string): Promise<boolean> {
  const configs = await getScanConfigs();
  const filtered = configs.filter(c => c.id !== id);
  if (filtered.length === configs.length) return false;
  await writeConfigs(filtered);
  return true;
}

// Actualizar la fecha del último escaneo
export async function updateScanDate(id: string, date: Date): Promise<void> {
  const configs = await getScanConfigs();
  const config = configs.find(c => c.id === id);
  if (config) {
    config.lastScanAt = date;
    await writeConfigs(configs);
  }
}

// Escritura interna
async function writeConfigs(configs: ScanConfig[]): Promise<void> {
  const filePath = getConfigsPath();
  await fs.writeFile(filePath, JSON.stringify(configs, null, 2));
}