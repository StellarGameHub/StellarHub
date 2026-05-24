import fs from 'fs/promises';
import path from 'path';
import { ScanConfig, RomGame } from '../../shared/types';
import { getGames, isGameBlocked, saveGames } from './libraryService';
import { GameCompletionStatus, GameSource } from '../../shared/enums';
import { fetchImagesForGameList } from './imageFetcher';
import { app } from 'electron';
import { dispatchGamesUpdatedEvent } from '../utils/utils';


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


/**
 * Escanea una carpeta según la configuración y actualiza la biblioteca.
 * @returns Número de juegos añadidos y eliminados (marcados como no instalados)
 */
export async function runRomsScan(config: ScanConfig): Promise<{ added: number; removed: number }> {
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
            const displayName = cleanRomTitle(fileName);

            const newGame: RomGame = {
                id: gameId,
                categories: config.categories || [],
                completionStatus: GameCompletionStatus.PENDING,
                isHidden: false,
                title: displayName,
                description: '',
                developers: [],
                publishers: [],
                releaseDate: undefined,
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

            if (await isGameBlocked(newGame)) {
                console.log(`[AutoScan] ROM bloqueada, omitiendo: ${newGame.title}`);
                continue;
            }

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


// src/main/services/romScannerService.ts

/**
 * Limpia el título de una ROM eliminando regiones, marcadores y etiquetas comunes.
 * Ejemplo: "Super Mario World (USA) [!]" -> "Super Mario World"
 */
function cleanRomTitle(rawTitle: string): string {
    // Eliminar extensiones conocidas (si llegara a tener alguna, aunque esperamos nombre sin extensión)
    let cleaned = rawTitle.replace(/\.(zip|7z|iso|bin|cue|gba|nes|snes|n64|z64|nds|cia|cci|wbfs|rvz|chd)$/i, '');

    // Patrones a eliminar
    const patterns = [
        // Regiones entre paréntesis
        /\(([A-Za-z]+[-/\s&]+)*?(USA|Europe|Japan|JAP|World|Germany|France|Italy|Spain|UK|Australia|Brazil|Korea|China|Taiwan|Hong Kong|En,Fr,De,Es|En,Fr|En,De|Fr,De|En,Es|Es,It)\)/gi,
        // Regiones entre corchetes
        /\[([A-Za-z]+[-/\s&]+)*?(USA|Europe|Japan|JAP|World|Germany|France|Italy|Spain|UK|Australia|Brazil|Korea|China|Taiwan|Hong Kong)\]/gi,
        // Etiquetas de dump (brackets con símbolos)
        /\[[!bftphmo!]+\]/gi,
        // Etiquetas de idioma entre paréntesis
        /\((En|Fr|De|Es|It|Nl|Pt|Ru|Ja|Ko|Zh|Ar)\)/gi,
        // Versiones y revisiones
        /\(Rev\s?\d+\)/gi,
        /\(v\d+\.\d+\)/gi,
        // Discos / tracks
        /\(Disc\s?\d+\)/gi,
        /\(Track\s?\d+\)/gi,
        // Sufijos como ` (USA)` ya capturados arriba, pero a veces sin paréntesis? No debería.
    ];

    for (const pattern of patterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    // Eliminar paréntesis o corchetes que hayan quedado vacíos
    cleaned = cleaned.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '');

    // Limpiar espacios sobrantes
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    return cleaned;
}