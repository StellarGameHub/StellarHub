import fs from 'fs/promises';
import path from 'path';

// (Las constantes STEAM_PATHS e IGNORED_FOLDERS se mantienen igual)

const STEAM_PATHS = [
    path.join(process.env.HOME || '', '.local/share/Steam'),
    path.join(process.env.HOME || '', '.steam/steam'),
    '/usr/share/steam',
];

const IGNORED_NAMES: string[] = [
    'Proton',
    'SteamLinuxRuntime',
    'Steamworks',
    'Steam',
    'DotNet',
    'CommonRedist',
    'DLC',
    'DepotCache',
    'Music',
    'ShaderCache',
    'SourceMods',
    'SteamApps',
    'SteamEmu',
    'UE4 Prerequisites',
    'vc_redist',
    'Unity',
    'Mono',
    'XNA',
    'DirectX',
    'PhysX',
    'OpenAL',
    'QuickTime',
    'WindowsMedia',
];

export interface LocalSteamGame {
    appId: number;
    name: string;
    installDir: string;
}

/**
 * Parsea un archivo .acf (Valve KeyValues format) de forma sencilla.
 * Devuelve un objeto con las claves del manifesto.
 */
async function parseAppManifest(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, 'utf-8');
    // El formato es algo como:
    // "AppState"
    // {
    //     "appid" "730"
    //     "name" "Counter-Strike: Global Offensive"
    //     "installdir" "Counter-Strike Global Offensive"
    //     ...
    // }
    const result: Record<string, string> = {};
    const lines = content.split('\n');
    for (const line of lines) {
        const match = line.match(/"(\w+)"\s+"(.+?)"/);
        if (match) {
            result[match[1]] = match[2];
        }
    }
    return result;
}

export async function scanInstalledSteamGames(): Promise<LocalSteamGame[]> {
    let steamRoot: string | null = null;
    for (const p of STEAM_PATHS) {
        try {
            const realPath = await fs.realpath(p);
            steamRoot = realPath;
            break;
        } catch { }
    }
    if (!steamRoot) {
        console.error('[SteamLocalScanner] No se encontró instalación de Steam');
        return [];
    }

    console.log(`[SteamLocalScanner] Steam root: ${steamRoot}`);

    // Lista de bibliotecas (rutas absolutas normalizadas)
    const libraryFolders: string[] = [steamRoot];

    const libraryFoldersPath = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
    try {
        const content = await fs.readFile(libraryFoldersPath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
            const match = line.match(/"path"\s*"([^"]+)"/);
            if (match) {
                let folder = match[1].replace(/\\/g, '/');
                let absolutePath = path.resolve(steamRoot, folder);
                try {
                    const realPath = await fs.realpath(absolutePath);
                    if (!libraryFolders.includes(realPath)) {
                        libraryFolders.push(realPath);
                        console.log(`[SteamLocalScanner] Biblioteca añadida: ${realPath}`);
                    }
                } catch (err) {
                    console.log(`[SteamLocalScanner] Biblioteca ignorada: ${absolutePath}`);
                }
            }
        }
    } catch (err) {
        console.error('[SteamLocalScanner] Error leyendo libraryfolders.vdf:', err);
    }

    const games: LocalSteamGame[] = [];

    for (const folder of libraryFolders) {
        const steamappsDir = path.join(folder, 'steamapps');
        let files: string[];
        try {
            files = await fs.readdir(steamappsDir);
        } catch {
            continue;
        }

        for (const file of files) {
            if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
                const manifestPath = path.join(steamappsDir, file);
                try {
                    const manifest = await parseAppManifest(manifestPath);
                    const appId = manifest.appid;
                    const name: string = manifest.name;
                    const installDir = manifest.installdir;

                    //SI ES ALGUNO DE LOS JUEGOS IGNORADOS
                    if (IGNORED_NAMES.some(ignoredName => name.includes(ignoredName))) continue;

                    if (!appId || !name || !installDir) {
                        console.log(`[SteamLocalScanner] Manifest incompleto: ${file}`);
                        continue;
                    }
                    // Construir la ruta completa al juego (dentro de common)
                    const gamePath = path.join(steamappsDir, 'common', installDir);
                    // Verificar que la carpeta exista (puede que no si el juego no está instalado o está en otro lugar)
                    try {
                        await fs.access(gamePath);
                        games.push({
                            appId: parseInt(appId, 10),
                            name,
                            installDir: gamePath,
                        });
                        console.log(`[SteamLocalScanner] Juego encontrado: ${name} (${appId})`);
                    } catch {
                        // El juego está en el manifiesto pero la carpeta no existe (p.ej., juego eliminado o movido)
                        console.log(`[SteamLocalScanner] Juego ${name} (${appId}) no instalado (carpeta ${gamePath} no existe)`);
                    }
                } catch (err) {
                    console.error(`[SteamLocalScanner] Error parseando ${file}:`, err);
                }
            }
        }
    }

    return games;
}