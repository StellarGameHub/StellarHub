import { ipcMain } from 'electron';
import { getGames, getGameData, saveGame, getLaunchConfig, updatePlaytime, deleteGame } from '../services/libraryService';
import { launchManualGame } from '../services/gameLauncher';
import { GameDetail, GameType } from '../../shared/types';

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

    ipcMain.handle('add-manual-game', async (event, gameData: Omit<GameDetail, 'id' | 'addedAt' | 'playtimeMinutes'>) => {
        try {
            const newId = `manual-${Date.now()}`;
            const newGame: GameDetail = {
                ...gameData,
                id: newId,
                addedAt: new Date(),
                playtimeMinutes: 0,
                source: GameType.manual,
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