import fs from 'fs/promises';
import path from 'path';
import { ScanConfig, RomGame } from '../../shared/types';
import { getGames, saveGames } from './libraryService';
import { GameCompletionStatus, GameSource } from '../../shared/enums';
import { fetchImagesForGameList } from './imageFetcher';

/**
 * Escanea una carpeta según la configuración y actualiza la biblioteca.
 * @returns Número de juegos añadidos y eliminados (marcados como no instalados)
 */
export async function runScan(config: ScanConfig): Promise<{ added: number; removed: number }> {
    const allGames = await getGames();

    const existingRoms = allGames.filter(g => g.source === GameSource.ROM && g.romDetails?.scanConfigId === config.id) as RomGame[];

    const existingPaths = new Map(
        existingRoms
            .filter(g => g.romDetails?.romPath)
            .map(g => [g.romDetails!.romPath, g])
    );


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
            const gameId = `rom-${config.id}-${crypto.randomUUID()}`;
            const fileName = path.basename(romPath, path.extname(romPath));

            const newGame: RomGame = {
                id: gameId,
                categories: config.categories || [],
                completionStatus: GameCompletionStatus.PENDING,
                isHidden: false,
                title: fileName,
                description: '',
                developers: [],
                publishers: [],
                releaseYear: undefined,
                genres: [],
                gameImages: {
                    grid: '',
                    wideGrid: '',
                    hero: '',
                    icon: '',
                    logo: ''
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
        ...allGames.filter(g => !(g.source === GameSource.ROM && g.romDetails?.scanConfigId === config.id)),
        ...existingRoms,
        ...added,
    ];


    console.log("ALL", allGames.length);
    console.log("EXISTING ROMS", existingRoms.length);
    console.log("ADDED", added.length);

    console.log(
        "UPDATED IDS",
        updatedGames.map(g => g.id)
    );

    console.log(
        "DUPLICATES",
        updatedGames
            .map(g => g.id)
            .filter((id, i, arr) => arr.indexOf(id) !== i)
    );
    
    await saveGames(updatedGames);
    fetchImagesForGameList(added.map(rom => rom.id));
    return { added: added.length, removed: removed.length };
}