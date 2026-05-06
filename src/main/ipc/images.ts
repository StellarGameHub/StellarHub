
import { saveGameImage } from '../services/imageService'; // para guardar la imagen seleccionada
import { getGameData, saveGame } from '../services/libraryService'; // para actualizar el juego con la ruta de imagen
import { ipcMain, app, dialog } from 'electron';    // para app.getPath('userData'), ipcMain.handle y dialog.showOpenDialog
import fs from 'fs/promises';      // para mkdir, writeFile (versión con promesas)
import path from 'path';           // para unir rutas

export function registerImageHandlers() {
    // Abre diálogo para seleccionar imagen y la guarda asociada a un gameId
    ipcMain.handle('select-and-save-grid-image', async (event, gameId: string) => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }
            ]
        });
        if (result.canceled || !result.filePaths[0]) {
            return null;
        }
        const savedPath = await saveGameImage(gameId, result.filePaths[0], 'grid');
        return savedPath;
    });

    // Maneja la actualización de la ruta de imagen en el juego
    ipcMain.handle('save-grid-image-buffer', async (event, { gameId, buffer, ext }) => {
        const imagesDir = path.join(app.getPath('userData'), 'images', 'grid');
        await fs.mkdir(imagesDir, { recursive: true });
        const destPath = path.join(imagesDir, `${gameId}.${ext}`);
        await fs.writeFile(destPath, Buffer.from(buffer));
        return destPath;
    });

    // Maneja la actualización de la ruta de imagen en el juego
    ipcMain.handle('update-game-image', async (event, { gameId, imagePath, imageType }) => {
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
}