
import { ipcMain } from 'electron';
import { SteamGridImageType } from '../../shared/enums';
import { getGameData, saveGame } from '../services/libraryService';
import { fetchAllGameImages, fetchImagesForCategories, fetchImagesForGameList } from '../services/imageFetcher';

export function registerImageHandlers() {

    ipcMain.handle('update-game-image', async (_, { gameId, imagePath, imageType }) => {
        const game = await getGameData(gameId);
        if (game && game.gameImages) {
            switch (imageType) {
                case 'grid':
                    game.gameImages.grid = imagePath;
                    break;
            }
            await saveGame(game);
        }
        return { success: true };
    });

    // ipc/images.ts
    ipcMain.handle('fetch-all-game-images', async (_, gameId: string, imageTypes: SteamGridImageType[]) => {
        let success = false;
        if (imageTypes) {
            success = await fetchAllGameImages(gameId, imageTypes);
        } else {
            success = await fetchAllGameImages(gameId);
        }
        return { success };
    });

    ipcMain.handle('fetch-images-for-game-list', async (_, gameIds: string[], imageTypes: SteamGridImageType[]) => {
        let result;
        if (imageTypes) {
            result = await fetchImagesForGameList(gameIds, imageTypes);
        } else {
            result = await fetchImagesForGameList(gameIds);
        }
        return result;
    });

    ipcMain.handle('fetch-images-for-categories', async (_, categoryIds: string[], imageTypes: SteamGridImageType[]) => {
        let result;
        if (imageTypes) {
            result = await fetchImagesForCategories(categoryIds, imageTypes);
        } else {
            result = await fetchImagesForCategories(categoryIds);
        }
        return result;
    });
}