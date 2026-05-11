import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Directorios comunes donde pueden estar las versiones de Proton
const PROTON_PATHS = [
  // path.join(process.env.HOME || '~', '.steam/root/compatibilitytools.d'),
  path.join(process.env.HOME || '~', '.local/share/Steam/compatibilitytools.d'),
  // path.join(process.env.HOME || '~', '.steam/steam/steamapps/common'),
  // path.join(process.env.HOME || '~', '.steam/debian-installation/steamapps/common'),
  '/usr/share/steam/compatibilitytools.d',  // si instalado por paquete
];

export interface ProtonVersion {
  name: string;      // "GE-Proton9-15"
  path: string;      // Ruta completa a la carpeta
  isDefault: boolean; // Si es la versión que usa Steam por defecto (system)
}

// Escanea directorios buscando carpetas que contengan 'proton' o 'Proton'
async function scanProtonVersions(): Promise<ProtonVersion[]> {
  const versions: ProtonVersion[] = [];

  for (const basePath of PROTON_PATHS) {
    try {
      await fs.access(basePath);
      const items = await fs.readdir(basePath, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          const protonPath = path.join(basePath, item.name);

          if (versions.some(x=>x.path == protonPath)) continue;

          // Verificar si dentro hay un ejecutable llamado 'proton' o 'Proton'
          const protonExe = path.join(protonPath, 'proton');
          const protonExeAlt = path.join(protonPath, 'Proton');
          if ( (await fileExists(protonExe) || await fileExists(protonExeAlt) )) {
            versions.push({
              name: item.name,
              path: protonPath,
              isDefault: false,
            });
          }
        }
      }
    } catch (err) {
      // El directorio no existe o no se puede leer
    }
  }

  return versions;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getProtonVersions(): Promise<ProtonVersion[]> {
  const versions = await scanProtonVersions();
  // Ordenar por nombre
  versions.sort((a, b) => a.name.localeCompare(b.name));
  return versions;
}