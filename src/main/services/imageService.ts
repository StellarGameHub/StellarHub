import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';

// export async function saveGameImage(
//     gameId: string,
//     originalPath: string,
//     type: 'grid' | 'cover' | 'banner'
// ): Promise<string> {
//     try {
//         const imagesDir = path.join(app.getPath('userData'), 'images', type);
//         await fs.mkdir(imagesDir, { recursive: true });

//         const ext = path.extname(originalPath);
//         const destFileName = `${gameId}${ext}`;
//         const destPath = path.join(imagesDir, destFileName);

//         await fs.copyFile(originalPath, destPath);
//         return destPath;
//     } catch (err) {
//         console.error(`Error saving image for game ${gameId} of type ${type}:`, err);
//         throw err;
//     }
// }

export async function deleteGameImage(gameId: string, type: 'grid' | 'cover' | 'banner'): Promise<void> {
    const imagesDir = path.join(app.getPath('userData'), 'images', type);
    // No asumimos extensión, así que buscamos cualquier archivo que empiece con gameId
    try {
        const files = await fs.readdir(imagesDir);
        for (const file of files) {
            if (file.startsWith(gameId)) {
                await fs.unlink(path.join(imagesDir, file));
            }
        }
    } catch (err) {
        console.error(`Error deleting image for game ${gameId} of type ${type}:`, err);
        // El directorio o archivo no existe; ignoramos
    }
}

// Nueva función para guardar imagen a partir de un buffer (usada al crear juego con imagen)

export async function saveGameImage(
    gameId: string,
    imageBuffer: Uint8Array,
    imageExt: string,
    imageType: 'grid' | 'cover' | 'banner'
): Promise<string> {
    try {
        // Carpeta destino completa
        const imagesDir = path.join(app.getPath('userData'), 'images', imageType);
        // Crear directorio si no existe (recursivo por si faltan 'images' también)
        await fs.mkdir(imagesDir, { recursive: true });

        // Ruta relativa para guardar en la base de datos
        const fileName = `${gameId}.${imageExt}`;
        const relativePath = path.join('images', imageType, fileName);
        const fullPath = path.join(imagesDir, fileName);

        await fs.writeFile(fullPath, Buffer.from(imageBuffer));
        console.log(`Imagen guardada en: ${fullPath}`);

        return relativePath;
    } catch (err) {
        console.error(`Error saving image for game ${gameId} (${imageType}):`, err);
        throw err;
    }
}