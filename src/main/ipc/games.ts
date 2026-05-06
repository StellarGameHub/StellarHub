import { ipcMain } from 'electron';
import { GameType } from '../../shared/enums';
import { GameDetail } from '../../shared/types';
import { saveGameImage } from '../services/imageService';
import { launchManualGame } from '../services/gameLauncher';
import { getGames, getGameData, saveGame, getLaunchConfig, updatePlaytime, deleteGame } from '../services/libraryService';

export function registerGameHandlers() {
    ipcMain.handle('get-games-summary', async () => {
        return getGames();
    });

    ipcMain.handle('get-game-detail', async (event, id: string) => {
        return getGameData(id);
    });

    ipcMain.handle('save-game-detail', async (event, game) => {
        await saveGame(game);
        return { success: true };
    });

    ipcMain.handle('add-manual-game', async (event, payload) => {
        try {
            const { gameData, imageBuffer, imageExt } = payload;

            const newId = crypto.randomUUID();

            let gridImagePath = '';

            if (imageBuffer && imageExt) {
                gridImagePath = await saveGameImage(newId, imageBuffer, imageExt, 'grid');
            }

            const newGame: GameDetail = {
                ...gameData,
                id: newId,
                addedAt: new Date(),
                playtimeMinutes: 0,
                source: GameType.manual,
                gameImages: {
                    grid: gridImagePath,
                }
            };

            await saveGame(newGame);
            return { success: true, gameId: newId };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });


    ipcMain.handle('launch-game-by-id', async (event, gameId: string) => {
        try {
            const gameData = await getGameData(gameId);
            const config = await getLaunchConfig(gameId);
            if (!config) {
                throw new Error(`No launch configuration found for game ${gameId}`);
            }
            // Switch para el tipo de Game
            switch (gameData?.source) {
                case GameType.manual:
                    // Lanzamos el juego y pasamos un callback para actualizar el playtime al salir

                    await launchManualGame(config, gameId, async (durationMinutes) => {
                        if (durationMinutes > 0) {
                            await updatePlaytime(gameId, durationMinutes);
                        }
                    });
                    break;
            }

            return { success: true };
        } catch (error) {
            console.error(`Error launching game ${gameId}:`, error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('delete-game-by-id', async (event, gameId: string) => {
        try {
            await deleteGame(gameId);
            return { success: true };
        } catch (error) {
            console.error(`Error deleting game ${gameId}:`, error);
            return { success: false, error: (error as Error).message };
        }
    });


}