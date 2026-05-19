import { getSettings } from './settingsService';
import { scanInstalledSteamGames } from './steamLocalScanner';
import { getScanConfigs, runScan } from './romScannerService'; // we need runScan from romScannerService
import { addSteamGame, getGames, saveGames } from './libraryService';
import { GameSource } from '../../shared/enums';
import fs from 'fs/promises';

import { fetchOwnedGames, SteamOwnedGame } from './steamApiService';
import { Game, ExecutableGame, SteamGame } from '../../shared/types';
import { fetchImagesForGameList } from './imageFetcher';

/**
 * Sincroniza la biblioteca de Steam del usuario con la base de datos local.
 * - Añade juegos que no existen localmente (marcados como no instalados).
 * - Actualiza los minutos jugados para juegos ya existentes.
 * - No modifica el flag 'isInstalled' (eso lo hace el escaneo local de manifiestos).
 */
export async function syncSteamLibrary(): Promise<{ added: number; updated: number }> {
    const settings = await getSettings();    

    if (!settings.steam.apiKey || !settings.steam.clientId) {
        console.log('[SteamSync] No se puede sincronizar: falta API Key o Steam ID');
        return { added: 0, updated: 0 };
    }

    let ownedGames: SteamOwnedGame[];
    try {
        ownedGames = await fetchOwnedGames(settings.steam.clientId, settings.steam.apiKey);
    } catch (err) {
        console.error('[SteamSync] Error al obtener juegos de Steam:', err);
        return { added: 0, updated: 0 };
    }

    const newGames = []; //To update images
    const localGames = await getGames();
    const steamGamesMap = new Map(localGames.filter(g => g.source === GameSource.STEAM).map(g => [(g as SteamGame).steamAppId, g]));

    let added = 0;
    let updated = 0;

    for (const steamGame of ownedGames) {
        const existing = steamGamesMap.get(steamGame.appid);
        if (!existing) {
            // Crear nuevo juego (no instalado por defecto)
            const newGame: Partial<SteamGame> = {
                id: `steam-${steamGame.appid}-${Date.now()}`,
                title: steamGame.name,
                source: GameSource.STEAM,
                steamAppId: steamGame.appid,
                isInstalled: false,  // inicialmente no instalado; el escaneo local lo actualizará si corresponde
                addedAt: new Date(),
                playtimeMinutes: steamGame.playtime_forever,
                gameImages: { grid: '', hero: '', logo: '', wideGrid: '' },
            };
            localGames.push(newGame as SteamGame);
            newGames.push(newGame as SteamGame);
            added++;
        } else {
            // Actualizar tiempo de juego si ha cambiado (Steam API da el total)
            if (existing.playtimeMinutes !== steamGame.playtime_forever) {
                existing.playtimeMinutes = steamGame.playtime_forever;
                updated++;
            }
            // Opcional: actualizar título si Steam lo cambió
            if (existing.title !== steamGame.name) {
                existing.title = steamGame.name;
                updated++;
            }
        }
    }

    if (added > 0 || updated > 0) {
        await saveGames(localGames);
        fetchImagesForGameList(newGames.map(g => g.id))
        console.log(`[SteamSync] Añadidos: ${added}, actualizados: ${updated}`);
    } else {
        console.log('[SteamSync] No se detectaron cambios');
    }

    return { added, updated };
}

export async function runAutoScans() {
    const settings = await getSettings();
    console.log('[AutoScan] Starting automatic scans...');

    // 1. Steam local scan
    if (settings.steam.enabled !== false) {
        try {
            const steamGames = await scanInstalledSteamGames();
            const existingGames = await getGames();
            const steamGameIds = existingGames.filter(g => g.source === GameSource.STEAM).map(g => (g as any).steamAppId);
            let added = 0;
            for (const sg of steamGames) {
                if (!steamGameIds.includes(sg.appId)) {
                    // Create new Steam game entry (minimal)
                    // We'll need to create a proper Game object
                    // For now, just log
                    console.log(`[AutoScan] New Steam game found: ${sg.name} (${sg.appId})`);
                    await addSteamGame(sg);
                    added++;
                }
            }
            console.log(`[AutoScan] Steam local scan complete: ${added} new games found.`);
        } catch (err) {
            console.error('[AutoScan] Steam local scan failed:', err);
        }

        // 2. Sincronización con la API de Steam (juegos poseídos, instalados o no)

        try {
            const { added, updated } = await syncSteamLibrary();
            console.log(`[AutoScan] Steam API sync: ${added} añadidos, ${updated} actualizados`);
        } catch (err) {
            console.error('[AutoScan] Error en sincronización con Steam API:', err);
        }
    }

    // 2. ROM scans
    // if (settings.autoScanRoms !== false) {
    //     try {
    //         const scanConfigs = await getScanConfigs();
    //         for (const config of scanConfigs) {
    //             if (config.enabled) {
    //                 console.log(`[AutoScan] Running ROM scan for ${config.systemName}...`);
    //                 const result = await runScan(config);
    //                 console.log(`[AutoScan] ROM scan for ${config.systemName}: added ${result.added}, removed ${result.removed}`);
    //             }
    //         }
    //     } catch (err) {
    //         console.error('[AutoScan] ROM scans failed:', err);
    //     }
    // }

    // 3. Manual games installation check
    // if (settings.autoCheckManualGames !== false) {
    //     try {
    //         const games = await getGames();
    //         let changed = false;
    //         for (const game of games) {
    //             if (game.source === GameSource.MANUAL) {
    //                 const execPath = game.launchConfig?.executablePath;
    //                 if (execPath) {
    //                     try {
    //                         await fs.access(execPath);
    //                         if (!game.isInstalled) {
    //                             game.isInstalled = true;
    //                             changed = true;
    //                         }
    //                     } catch {
    //                         if (game.isInstalled) {
    //                             game.isInstalled = false;
    //                             changed = true;
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //         if (changed) {
    //             await saveGames(games);
    //             console.log('[AutoScan] Updated manual games installation status.');
    //         }
    //     } catch (err) {
    //         console.error('[AutoScan] Manual games check failed:', err);
    //     }
    // }

    console.log('[AutoScan] All automatic scans completed.');
}