import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { GameCategory } from '../../shared/types';
import { saveGameCategoryImage } from './imageService';

// --- Helpers de Rutas ---
function getCategoriesFilePath(): string {
    // app.getPath('userData') seguirá las directrices XDG en Linux (~/.config/estelarhub/)
    const userDataPath = app.getPath('userData');
    // Asegura que la carpeta exista (muy importante)
    fs.mkdir(userDataPath, { recursive: true }).catch(err => console.error('Error creating config dir:', err));
    return path.join(userDataPath, 'categories.json');
}

export async function getCategories(): Promise<GameCategory[]> {
    const filePath = getCategoriesFilePath();
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        console.log('Loaded categories:', data);
        return JSON.parse(data) as GameCategory[];
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            return [];
        }
        console.warn('No categories file found, returning empty array.');
        throw err;
    }
}


async function saveCategories(categories: GameCategory[]): Promise<void> {
    const filePath = getCategoriesFilePath();
    await fs.writeFile(filePath, JSON.stringify(categories, null, 2));
}

// Agrega una nueva categoría
export async function addCategory(name: string, imageBuffer: Uint8Array, imageExt: string): Promise<void> {

    const newID = crypto.randomUUID();

    const iconPath = await saveGameCategoryImage(newID, imageBuffer, imageExt); // Guardamos la imagen y obtenemos su ruta relativa

    const newCategory: GameCategory = {
        id: newID,
        name: name,
        icon: iconPath,
    };

    var categories = await getCategories();
    categories.push(newCategory);
    await saveCategories(categories);
}

// Elimina una categoría por ID
export async function removeCategory(categoryId: string): Promise<void> {
    var categories = await getCategories();

    categories = categories.filter(cat => cat.id !== categoryId);
    await saveCategories(categories);
}

