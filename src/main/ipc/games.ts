import { app, ipcMain } from 'electron';
import { GameSource, SteamGridImageType } from '../../shared/enums';
import { ExecutableGame, GameImages, RomGame, SteamGame } from '../../shared/types';
import { killGame, launchEmulator, launchManualGame, launchSteamGame } from '../services/gameLauncher';
import { getGames, getGameData, saveGame, updatePlaytime, deleteGame, addManualGame, installGame } from '../services/libraryService';
import { saveGameImage } from '../services/imageService';
import path from 'path';
import fs from 'fs/promises';


export function registerGameHandlers() {
    ipcMain.handle('get-games-summary', async () => {
        let games = await getGames();
        games = games.sort((a, b) => a.title.localeCompare(b.title));
        return games;
    });

    ipcMain.handle('get-game-detail', async (_, id: string) => {
        return getGameData(id);
    });

    ipcMain.handle('save-game-detail', async (_, game) => {
        await saveGame(game);
        return { success: true };
    });

    ipcMain.handle('add-manual-game', async (_, gameData) => {
        console.log('Received add-manual-game with payload:', gameData);
        try {
            var newId = await addManualGame(gameData);

            return { success: true, gameId: newId };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('launch-game-by-id', async (_, gameId: string) => {
        try {
            const game = await getGameData(gameId);
            if (!game) throw new Error(`Juego ${gameId} no encontrado`);

            let pid: number;
            if (game.source === GameSource.ROM) {
                pid = await launchEmulator(game as RomGame, async (minutes) => {
                    await updatePlaytime(gameId, minutes);
                });
            } else if (game.source === GameSource.STEAM) {
                pid = await launchSteamGame(game as SteamGame, async (minutes) => {
                    await updatePlaytime(gameId, minutes);
                })
            }
            else {
                const config = (game as ExecutableGame).launchConfig;
                pid = await launchManualGame(config, gameId, async (minutes) => {
                    await updatePlaytime(gameId, minutes);
                });
            }
            return { success: true, pid };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('kill-game', async (_, gameId: string) => {
        const killed = killGame(gameId);
        return { success: killed };
    });

    ipcMain.handle('delete-game-by-id', async (_, data) => {
        const gameId = data.gameId;
        const blackList = data.blackList;

        console.log("ipc recibed delete game with data:", data)

        try {
            await deleteGame(gameId, blackList);
            return { success: true };
        } catch (error) {
            console.error(`Error deleting game ${gameId}:`, error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('install-game-by-id', async (_, gameId: string) => {
        try {
            await installGame(gameId);
            console.log("InstallGameByID success with gameId:", gameId)
            return { success: true };
        } catch (error) {
            console.error(`Error intalling game ${gameId}:`, error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('update-game', async (event, { gameId, updates, imageData, gameSource }) => {
        const game = await getGameData(gameId);
        if (!game) throw new Error('Game not found');

        // Actualizar metadatos
        game.title = updates.title ?? game.title;
        game.description = updates.description ?? game.description;
        game.developers = updates.developers ?? game.developers;
        game.publishers = updates.publishers ?? game.publishers;
        game.releaseDate = updates.releaseDate ?? game.releaseDate;
        game.genres = updates.genres ?? game.genres;

        switch (game.source) {
            case GameSource.MANUAL:
                const manualGame = game as ExecutableGame;
                if (updates.launchConfig) {
                    manualGame.launchConfig = { ...updates.launchConfig };
                }
                break;
            case GameSource.ROM:
                const romGame = game as RomGame;
                romGame.romDetails.romPath = updates.romDetails?.romPath ?? romGame.romDetails.romPath;
                romGame.romDetails.emulatorPath = updates.romDetails?.emulatorPath ?? romGame.romDetails.emulatorPath;
                romGame.romDetails.launchArguments = updates.romDetails?.launchArguments ?? romGame.romDetails.launchArguments;
                break;
        }

        // Guardar nuevas imágenes (si vienen como File)
        for (const [imageTypeString, data] of Object.entries(imageData)) {
            const imageData = (data as {
                buffer: Uint8Array;
                ext: string;
            })

            if (imageData && imageData.buffer && imageData.ext) {
                const imageTypeMap: Record<string, SteamGridImageType> = {
                    gridImage: SteamGridImageType.GRID,
                    wideGridImage: SteamGridImageType.WIDEGRID,
                    heroImage: SteamGridImageType.HERO,
                    logoImage: SteamGridImageType.LOGO,
                    iconImage: SteamGridImageType.ICON,
                };
                const imageType = imageTypeMap[imageTypeString];
                if (imageType == null) continue;

                const buffer = Buffer.from(imageData.buffer);
                const ext = imageData.ext;
                const relativePath = await saveGameImage(gameId, buffer, ext, imageType);
                game.gameImages[imageTypeString as keyof GameImages] = relativePath;

            }
        }
        console.log("Saving game with updated data:", game);
        await saveGame(game);
        return { success: true };
    });
}