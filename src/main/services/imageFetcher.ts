import { getSettings } from './settingsService';
import { getGameData, getGameIdsByCategory, saveGame } from './libraryService';
import { saveGameImage } from './imageService'; // usaremos la función existente
import { SteamGridImageType } from '../../shared/enums';


//We can import this from 'steamgriddb' cause is no ESM bla bla
interface SGDBGame {
    id: number;
    name: string;

}

interface SGDBImage {
    id: number;
    url: URL;
    tags: string[];
    score: number;
}


// Configuración de la API
const STEAMGRIDDB_API = 'https://www.steamgriddb.com/api/v2';
let apiKey: string | null = null;
let sgdbClient: any | null = null;

// Obtener API key desde settings (cacheada)
async function getApiKey(): Promise<string | null> {
    if (apiKey !== null) return apiKey;
    const settings = await getSettings();
    apiKey = settings.steamGridDB.apiKey || null;
    return apiKey;
}

// BuildClient
async function prepareClient() {
    if (sgdbClient) return;
    const key = await getApiKey();
    if (!key) throw new Error('SteamGridDB API key not configured');
    // Dinamic import of ESM module
    const SGDBModule = await import('steamgriddb');
    const SGDB = SGDBModule.default;
    sgdbClient = new SGDB(key);
}

// Buscar juegos por nombre (y opcionalmente plataforma)
export async function searchGameOnSteamGridDB(query: string): Promise<SGDBGame[] | undefined> {
    if (!sgdbClient) await prepareClient();
    const games = await sgdbClient?.searchGame(query);
    return games;
}

export async function getSGDBImagesByID(steamGridID: number, type: SteamGridImageType): Promise<SGDBImage[] | undefined> {
    if (!sgdbClient) await prepareClient();

    switch (type) {
        case SteamGridImageType.GRID:
            return sgdbClient?.getGrids({ type: 'game', id: steamGridID, dimensions: ["600x900"] });
        case SteamGridImageType.WIDEGRID:
            return sgdbClient?.getGrids({ type: 'game', id: steamGridID, dimensions: ["460x215", "920x430"] });
        case SteamGridImageType.HERO:
            return sgdbClient?.getHeroesById(steamGridID);
        case SteamGridImageType.LOGO:
            return sgdbClient?.getLogosById(steamGridID);
        case SteamGridImageType.ICON:
            return sgdbClient?.getIconsById(steamGridID);
        default: return undefined;
    }

}

// Obtener imágenes de un juego específico por su ID de SteamGridDB
export async function getGameImagesFromSteamGridDB(steamGridId: number, types: SteamGridImageType[]): Promise<SGDBImage[]> {
    const images: SGDBImage[] = [];
    for (const type of types) {

        const sgdbImages = await getSGDBImagesByID(steamGridId, type);
        if (!sgdbImages) continue;

        images.push(...sgdbImages);
    }
    //Sort by Score
    images.sort((a, b) => b.score - a.score)
    return images.sort();
}

// Descargar una imagen desde URL y guardarla usando imageService
async function downloadAndSaveImage(url: URL, gameId: string, type: SteamGridImageType, ext?: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || '';
    let imageExt = ext;
    if (!imageExt) {
        if (contentType.includes('jpeg') || contentType.includes('jpg')) imageExt = 'jpg';
        else if (contentType.includes('png')) imageExt = 'png';
        else if (contentType.includes('webp')) imageExt = 'webp';
        else imageExt = 'png';
    }
    return saveGameImage(gameId, new Uint8Array(buffer), imageExt, type);
}

// Función principal: buscar y descargar la mejor imagen para un juego
export async function fetchAndAssignGameImage(gameId: string, imageType: SteamGridImageType): Promise<boolean> {
    try {
        const game = await getGameData(gameId);
        if (!game) throw new Error(`Game ${gameId} not found`);

        // 1. Buscar juego en SteamGridDB
        const searchResults = await searchGameOnSteamGridDB(game.title);
        if (!searchResults || !searchResults.length) {
            console.warn(`No SteamGridDB results for ${game.title}`);
            return false;
        }
        const bestMatch = searchResults[0]; // primer resultado
        // 2. Obtener imágenes del tipo deseado
        const images = await getGameImagesFromSteamGridDB(bestMatch.id, [imageType]);
        if (!images.length) {
            console.warn(`No ${imageType} images found for ${game.title}`);
            return false;
        }
        // 3. Elegir la primera imagen no NSFW (si hay, sino la primera)
        const image = images.find(img => !img.tags?.includes('nsfw')) || images[0];
        // 4. Descargar y guardar imagen
        const savedPath = await downloadAndSaveImage(image.url, gameId, imageType);
        // 5. Actualizar el objeto GameDetail
        if (!game.gameImages) game.gameImages = { grid: undefined, hero: undefined, logo: undefined, icon: undefined, wideGrid: undefined };

        switch (imageType) {
            case SteamGridImageType.GRID:
                game.gameImages.grid = savedPath;
            case SteamGridImageType.WIDEGRID:
                game.gameImages.wideGrid = savedPath;
            case SteamGridImageType.HERO:
                game.gameImages.hero = savedPath;
            case SteamGridImageType.LOGO:
                game.gameImages.logo = savedPath;
            case SteamGridImageType.ICON:
                game.gameImages.icon = savedPath;
        }

        await saveGame(game);
        console.log(`Image ${imageType} saved for ${game.title}`);
        return true;
    } catch (err) {
        console.error(`Error fetching image for ${gameId}:`, err);
        return false;
    }

}


/** 
 * Update all images of one Game
 * @param gameId GameID 
 * @param imageTypes Array with the imageType to update (all by default)
 * @returns Promise<boolean> true if al least one image has ben updated
 */
export async function fetchAllGameImages(
    gameId: string,
    imageTypes: SteamGridImageType[] = [
        SteamGridImageType.GRID,
        SteamGridImageType.WIDEGRID,
        SteamGridImageType.HERO,
        SteamGridImageType.LOGO,
        SteamGridImageType.ICON
    ],
    onlyMissing: boolean = false
): Promise<boolean> {
    try {
        const game = await getGameData(gameId);
        if (!game) throw new Error(`Game ${gameId} not found`);

        // Search game on SGDB
        const searchResults = await searchGameOnSteamGridDB(game.title);
        if (!searchResults?.length) {
            console.warn(`No SteamGridDB results for ${game.title}`);
            return false;
        }
        const bestMatch = searchResults[0];
        let anySuccess = false;

        // Get best non NSFW (Go to horny jain) image
        for (const type of imageTypes) {
            const images = await getGameImagesFromSteamGridDB(bestMatch.id, [type]);
            if (!images.length) continue;
            const image = images.find(img => !img.tags?.includes('nsfw')) || images[0];
            const savedPath = await downloadAndSaveImage(image.url, gameId, type);
            // Actualizar el objeto GameDetail según el tipo
            if (!game.gameImages) game.gameImages = {};
            switch (type) {
                case SteamGridImageType.GRID:
                    if (onlyMissing && game.gameImages.grid != null) continue;
                    game.gameImages.grid = savedPath;
                    break;
                case SteamGridImageType.WIDEGRID:
                    if (onlyMissing && game.gameImages.grid != null) continue;
                    game.gameImages.wideGrid = savedPath;
                    break;
                case SteamGridImageType.HERO:
                    if (onlyMissing && game.gameImages.grid != null) continue;
                    game.gameImages.hero = savedPath;
                    break;
                case SteamGridImageType.LOGO:
                    if (onlyMissing && game.gameImages.grid != null) continue;
                    game.gameImages.logo = savedPath;
                    break;
                case SteamGridImageType.ICON:
                    if (onlyMissing && game.gameImages.grid != null) continue;
                    game.gameImages.icon = savedPath;
                    break;
            }
            anySuccess = true;
            console.log(`Image ${type} saved for ${game.title}`);
        }

        if (anySuccess) {
            await saveGame(game);
        }
        return anySuccess;
    } catch (err) {
        console.error(`Error fetching all images for game with id ${gameId}:`, err);
        return false;
    }
}

/**
 * Update multiple game's images. For game scans, etc.
 * @param gameIds Array with game IDs
 * @param imageTypes Array with the imageType to update (all by default)
 * @param onProgress Callback for progress report (updated, total)
 * @returns How many games where succesfully updated
 */
export async function fetchImagesForGameList(
    gameIds: string[],
    imageTypes?: SteamGridImageType[],
    onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    const total = gameIds.length;
    for (let i = 0; i < total; i++) {
        const gameId = gameIds[i];
        const game = await getGameData(gameId);
        if (!game) {
            failed++;
            continue;
        }
        const ok = await fetchAllGameImages(gameId, imageTypes);
        if (ok) success++;
        else failed++;
        if (onProgress) onProgress(i + 1, total);
    }
    return { success, failed };
}

// En imageFetcherService.ts
export async function fetchImagesForCategories(
    categoryIds: string[],
    imageTypes?: SteamGridImageType[],
    onProgress?: (current: number, total: number, gameTitle: string) => void
): Promise<{ success: number; failed: number }> {
    const gameIds = await getGameIdsByCategory(categoryIds);
    if (!gameIds.length) return { success: 0, failed: 0 };
    let success = 0;
    let failed = 0;
    const total = gameIds.length;
    for (let i = 0; i < total; i++) {
        const gameId = gameIds[i];
        const game = await getGameData(gameId);
        if (!game) {
            failed++;
            continue;
        }
        const ok = await fetchAllGameImages(gameId, imageTypes);
        if (ok) success++;
        else failed++;
        if (onProgress) onProgress(i + 1, total, game.title);
    }
    return { success, failed };
}