import { ipcMain } from 'electron';
import { GameSource } from '../../shared/enums';
import { ExecutableGame, RomGame, SteamGame } from '../../shared/types';
import { killGame, launchEmulator, launchManualGame, launchSteamGame } from '../services/gameLauncher';
import { getGames, getGameData, saveGame, updatePlaytime, deleteGame, addManualGame, installGame } from '../services/libraryService';


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

    ipcMain.handle('delete-game-by-id', async (_, gameId: string) => {
        try {
            await deleteGame(gameId);
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

}