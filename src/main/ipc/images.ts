
import { saveGameImage } from '../services/imageService'; // para guardar la imagen seleccionada
import { getGameData, saveGame } from '../services/libraryService'; // para actualizar el juego con la ruta de imagen
import { ipcMain, app, dialog } from 'electron';    // para app.getPath('userData'), ipcMain.handle y dialog.showOpenDialog
import fs from 'fs/promises';      // para mkdir, writeFile (versión con promesas)
import path from 'path';           // para unir rutas

export function registerImageHandlers() {

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