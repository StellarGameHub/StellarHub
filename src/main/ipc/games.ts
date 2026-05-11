import { ipcMain } from 'electron';
import { GameSource, SteamGridImageType } from '../../shared/enums';
import { ExecutableGame, Game, LaunchConfig, RomGame } from '../../shared/types';
import { saveGameImage } from '../services/imageService';
import { killGame, launchEmulator, launchManualGame } from '../services/gameLauncher';
import { getGames, getGameData, saveGame, getLaunchConfig, updatePlaytime, deleteGame } from '../services/libraryService';
import { fetchAllGameImages } from '../services/imageFetcher';

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

    ipcMain.handle('add-manual-game', async (_, payload) => {
        console.log('Received add-manual-game with payload:', payload);
        try {
            const { gameData, imageBuffer, imageExt } = payload;

            console.log('Game data:', gameData);
            console.log('Image buffer length:', imageBuffer ? imageBuffer.byteLength : 'No image');
            console.log('Image extension:', imageExt);

            const newId = crypto.randomUUID();

            let gridImagePath = '';

            if (imageBuffer && imageExt) {
                gridImagePath = await saveGameImage(newId, imageBuffer, imageExt, SteamGridImageType.GRID);
            }

            const newGame: ExecutableGame = {
                ...gameData,
                id: newId,
                addedAt: new Date(),
                playtimeMinutes: 0,
                source: GameSource.MANUAL,
                gameImages: {
                    grid: gridImagePath,
                },
            };

            await saveGame(newGame);
            await fetchAllGameImages(newGame.id);
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
            } else {
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


}