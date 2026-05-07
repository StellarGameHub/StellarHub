import { ipcMain } from "electron";
import { addCategory, getCategories, removeCategory } from "../services/categoryService";

export function registerCategoriesHandlers() {
    ipcMain.handle('get-game-categories', async () => {
        var categories = await getCategories();
        return { success: true, categories };
    });

    ipcMain.handle('add-game-category', async (_, payload) => {
        // payload: { name: string, imageBuffer: Uint8Array, imageExt: string }
        const { name, imageBuffer, imageExt } = payload;

        try {
            await addCategory(name, imageBuffer, imageExt);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('delete-game-category', async (_, categoryId: string) => {
        try {
            removeCategory(categoryId);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });
}
