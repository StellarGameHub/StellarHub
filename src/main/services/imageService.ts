import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { SteamGridImageType } from '../../shared/enums';


//All image types by default
export async function deleteGameImages(
    gameId: string,
    imageTypes: SteamGridImageType[] = [
        SteamGridImageType.GRID,
        SteamGridImageType.WIDEGRID,
        SteamGridImageType.HERO,
        SteamGridImageType.ICON,
        SteamGridImageType.LOGO,
    ]): Promise<void> {

    for (const imageType in imageTypes) {
        const imagesDir = path.join(app.getPath('userData'), 'images', SteamGridImageType[imageType]);

        try {
            const files = await fs.readdir(imagesDir);
            for (const file of files) {
                if (file.startsWith(gameId)) {
                    await fs.unlink(path.join(imagesDir, file));
                }
            }
        } catch (err) {
            console.error(`Error deleting image for game ${gameId} of type ${imageType}:`, err);
            // El directorio o archivo no existe; ignoramos
        }
    }
}

// Nueva función para guardar imagen a partir de un buffer (usada al crear juego con imagen)

export async function saveGameImage(
    gameId: string,
    imageBuffer: Uint8Array,
    imageExt: string,
    imageType: SteamGridImageType
): Promise<string> {
    try {
        // Carpeta destino completa
        const imagesDir = path.join(app.getPath('userData'), 'images', SteamGridImageType[imageType]);
        // Crear directorio si no existe (recursivo por si faltan 'images' también)
        await fs.mkdir(imagesDir, { recursive: true });

        // Ruta relativa para guardar en la base de datos
        const fileName = `${gameId}.${imageExt}`;
        const relativePath = path.join('images', SteamGridImageType[imageType], fileName);
        const fullPath = path.join(imagesDir, fileName);

        await fs.writeFile(fullPath, Buffer.from(imageBuffer));
        console.log(`Imagen guardada en: ${fullPath}`);

        return relativePath;
    } catch (err) {
        console.error(`Error saving image for game ${gameId} (${imageType}):`, err);
        throw err;
    }
}

export async function saveGameCategoryImage(
    categoryId: string,
    imageBuffer: Uint8Array,
    imageExt: string,
): Promise<string> {
    try {
        // Carpeta destino completa
        const imagesDir = path.join(app.getPath('userData'), 'images', 'categories');
        // Crear directorio si no existe (recursivo por si faltan 'images' también)
        await fs.mkdir(imagesDir, { recursive: true });

        // Ruta relativa para guardar en la base de datos
        const fileName = `${categoryId}.${imageExt}`;
        const relativePath = path.join('images', 'categories', fileName);
        const fullPath = path.join(imagesDir, fileName);

        await fs.writeFile(fullPath, Buffer.from(imageBuffer));
        console.log(`Imagen guardada en: ${fullPath}`);

        return relativePath;
    } catch (err) {
        console.error(`Error saving image for categorie ${categoryId}:`, err);
        throw err;
    }
}