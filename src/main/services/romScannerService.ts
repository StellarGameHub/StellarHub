import fs from 'fs/promises';
import path from 'path';
import { ScanConfig, RomGame } from '../../shared/types';
import { getGames, saveGames } from './libraryService';
import { GameSource } from '../../shared/enums';

/**
 * Escanea una carpeta según la configuración y actualiza la biblioteca.
 * @returns Número de juegos añadidos y eliminados (marcados como no instalados)
 */
export async function runScan(config: ScanConfig): Promise<{ added: number; removed: number }> {
    const allGames = await getGames();
    const existingRoms = allGames.filter(g => g.source === GameSource.ROM && g.romDetails?.scanConfigId === config.id) as RomGame[];
    const existingPaths = new Map(existingRoms.map(g => [g.romDetails.romPath, g]));

    // 1. Obtener archivos ROMs en la carpeta
    let currentFiles: string[] = [];
    try {
        const files = await fs.readdir(config.romsFolder);
        currentFiles = files.filter(f => {
            const ext = path.extname(f).toLowerCase();
            return config.extensions.includes(ext);
        }).map(f => path.join(config.romsFolder, f));
    } catch (err) {
        console.error(`Error reading ${config.romsFolder}:`, err);
        return { added: 0, removed: 0 };
    }

    const currentPaths = new Set(currentFiles);
    const added: RomGame[] = [];
    const removed: string[] = [];

    // 2. Detectar nuevos juegos
    for (const romPath of currentFiles) {
        if (!existingPaths.has(romPath)) {
            const gameId = `rom-${config.id}-${Date.now()}-${Math.random().toString(36)}`;
            const fileName = path.basename(romPath, path.extname(romPath));
            const newGame: RomGame = {
                id: gameId,
                categories: config.categories || [],
                isHidden: false,
                title: fileName,
                description: '',
                developers: [],
                publishers: [],
                releaseYear: undefined,
                genres: [],
                gameImages: {
                    grid: '', //BUSCAR EN STEAMGRIDDB?
                    cover: '',
                    background: '',
                    banner: '',
                },
                isInstalled: true,
                source: GameSource.ROM,
                addedAt: new Date(),
                lastPlayedAt: undefined,
                playtimeMinutes: 0,
                romDetails: {
                    scanConfigId: config.id,
                    romPath: romPath,
                    emulatorPath: config.emulatorPath,
                    launchArguments: config.launchArguments,
                },
            };
            added.push(newGame);
        }
    }

    // 3. Detectar juegos eliminados (marcar como no instalados)
    for (const [path, game] of existingPaths) {
        if (!currentPaths.has(path) && game.isInstalled === true) {
            game.isInstalled = false;
            removed.push(game.id);
        } else if (currentPaths.has(path) && game.isInstalled === false) {
            // Volvió a aparecer
            game.isInstalled = true;
        }
    }

    // 4. Guardar cambios
    const updatedGames = [
        ...allGames.filter(g => !existingPaths.has(g.id) && !removed.includes(g.id)), // los que no son de este escaneo ni fueron eliminados
        ...added, // los nuevos
        ...existingRoms.map(g => g) // los modificados (isInstalled)
    ];
    await saveGames(updatedGames);
    return { added: added.length, removed: removed.length };
}