import { ipcMain } from 'electron';
import { getGames, getGame, saveGame, getLaunchConfig } from '../services/libraryService';
import { launchGame } from '../services/gameLauncher';

export function registerGameHandlers() {
    ipcMain.handle('get-games-summary', async () => {
        return getGames();
    });

    ipcMain.handle('get-game-detail', async (event, id: string) => {
        return getGame(id);
    });

    ipcMain.handle('save-game-detail', async (event, game) => {
        await saveGame(game);
        return { success: true };
    });

    ipcMain.handle('launch-game-by-id', async (event, gameId: string) => {
        try {
            const config = await getLaunchConfig(gameId);
            if (!config) {
                throw new Error(`No launch configuration found for game ${gameId}`);
            }
            await launchGame(
                gameId, config);
            return { success: true };
        } catch (error) {
            console.error(`Failed to launch game ${gameId}:`, error);
            return { success: false, error: (error as Error).message };
        }
    });

}