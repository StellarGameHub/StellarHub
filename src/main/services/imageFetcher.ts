import { getSettings } from './settingsService';
import { getGameData, getGameIdsByCategory, saveGame } from './libraryService';
import { saveGameImage } from './imageService';
import { SteamGridImageType } from '../../shared/enums';
import { dispatchGamesUpdatedEvent, dispatchImagesUpdatedEvent } from '../utils/utils';

// ====================================================================================
// TYPES
// ====================================================================================

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

type ProgressCallback = (
    current: number,
    total: number,
    message?: string
) => void;

// ====================================================================================
// CONFIG
// ====================================================================================

const imageTypeMap = {
    [SteamGridImageType.GRID]: 'grid',
    [SteamGridImageType.WIDEGRID]: 'wideGrid',
    [SteamGridImageType.HERO]: 'hero',
    [SteamGridImageType.LOGO]: 'logo',
    [SteamGridImageType.ICON]: 'icon'
} as const;

const STEAMGRIDDB_API = 'https://www.steamgriddb.com/api/v2';

let apiKey: string | null = null;
let sgdbClient: any | null = null;
let clientPromise: Promise<any> | null = null;

// ====================================================================================
// CLIENT
// ====================================================================================

async function getApiKey(): Promise<string | null> {
    if (apiKey !== null)
        return apiKey;

    const settings = await getSettings();

    apiKey = settings.steamGridDB.apiKey || null;

    return apiKey;
}

async function getClient() {
    if (sgdbClient)
        return sgdbClient;

    if (!clientPromise) {
        clientPromise = (async () => {

            const key = await getApiKey();

            if (!key)
                throw new Error('SteamGridDB API key not configured');

            const SGDBModule = await import('steamgriddb');
            const SGDB = SGDBModule.default;

            sgdbClient = new SGDB(key);

            return sgdbClient;

        })();
    }

    return clientPromise;
}

// ====================================================================================
// SEARCH
// ====================================================================================

export async function searchGameOnSteamGridDB(
    query: string
): Promise<SGDBGame[]> {

    const client = await getClient();

    const games = await client.searchGame(query);

    return games || [];
}

function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function getBestGameMatch(
    query: string,
    results: SGDBGame[]
): SGDBGame | null {

    if (!results.length)
        return null;

    const normalizedQuery = normalizeTitle(query);

    // Exact normalized match first
    const exact = results.find(r =>
        normalizeTitle(r.name) === normalizedQuery
    );

    if (exact)
        return exact;

    // Contains match
    const contains = results.find(r =>
        normalizeTitle(r.name).includes(normalizedQuery)
    );

    if (contains)
        return contains;

    return results[0];
}

// ====================================================================================
// IMAGES
// ====================================================================================

export async function fetchSteamGridImages(
    steamGridId: number,
    type: SteamGridImageType
): Promise<SGDBImage[]> {

    const client = await getClient();

    switch (type) {

        case SteamGridImageType.GRID:
            return client.getGrids({
                type: 'game',
                id: steamGridId,
                dimensions: ['600x900']
            });

        case SteamGridImageType.WIDEGRID:
            return client.getGrids({
                type: 'game',
                id: steamGridId,
                dimensions: ['460x215', '920x430']
            });

        case SteamGridImageType.HERO:
            return client.getHeroesById(steamGridId);

        case SteamGridImageType.LOGO:
            return client.getLogosById(steamGridId);

        case SteamGridImageType.ICON:
            return client.getIconsById(steamGridId);

        default:
            return [];
    }
}

export async function getBestImageForType(
    steamGridId: number,
    type: SteamGridImageType
): Promise<SGDBImage | null> {

    const images = await fetchSteamGridImages(steamGridId, type);

    if (!images.length)
        return null;

    const sorted = images.sort((a, b) => b.score - a.score);

    return sorted.find(img => !img.tags?.includes('nsfw'))
        || sorted[0];
}

// ====================================================================================
// DOWNLOAD
// ====================================================================================

async function downloadAndSaveImage(
    url: URL,
    gameId: string,
    type: SteamGridImageType,
    ext?: string
): Promise<string> {

    const response = await fetch(url);

    if (!response.ok)
        throw new Error(`Failed to download image: ${response.statusText}`);

    const buffer = await response.arrayBuffer();

    const contentType = response.headers.get('content-type') || '';

    let imageExt = ext;

    if (!imageExt) {

        if (contentType.includes('jpeg') || contentType.includes('jpg'))
            imageExt = 'jpg';

        else if (contentType.includes('png'))
            imageExt = 'png';

        else if (contentType.includes('webp'))
            imageExt = 'webp';

        else
            imageExt = 'png';
    }

    return saveGameImage(
        gameId,
        new Uint8Array(buffer),
        imageExt,
        type
    );
}

// ====================================================================================
// GAME IMAGE HELPERS
// ====================================================================================

function ensureGameImages(game: any) {

    if (!game.gameImages)
        game.gameImages = {};
}

function assignImageToGame(
    game: any,
    type: SteamGridImageType,
    path: string
) {

    ensureGameImages(game);

    const key = imageTypeMap[type];

    game.gameImages[key] = path;
}

function hasImage(
    game: any,
    type: SteamGridImageType
): boolean {

    if (!game.gameImages)
        return false;

    const key = imageTypeMap[type];

    return game.gameImages[key] != null;
}

// ====================================================================================
// MAIN
// ====================================================================================

async function fetchAndAssignSingleImage(
    game: any,
    steamGridId: number,
    type: SteamGridImageType,
    onlyMissing = false
): Promise<boolean> {

    if (onlyMissing && hasImage(game, type))
        return false;

    const image = await getBestImageForType(
        steamGridId,
        type
    );

    if (!image)
        return false;

    const savedPath = await downloadAndSaveImage(
        image.url,
        game.id,
        type
    );

    assignImageToGame(game, type, savedPath);

    return true;
}

export async function fetchAllGameImages(
    gameId: string,
    imageTypes: SteamGridImageType[] = [
        SteamGridImageType.GRID,
        SteamGridImageType.WIDEGRID,
        SteamGridImageType.HERO,
        SteamGridImageType.LOGO,
        SteamGridImageType.ICON
    ],
    onlyMissing = false,
    onProgress?: (
        current: number,
        total: number,
        message?: string
    ) => void
): Promise<boolean> {

    try {

        const game = await getGameData(gameId);

        if (!game)
            throw new Error(`Game ${gameId} not found`);

        const searchResults = await searchGameOnSteamGridDB(
            game.title
        );

        const bestMatch = getBestGameMatch(
            game.title,
            searchResults
        );

        if (!bestMatch) {
            console.warn(`No SteamGridDB results for ${game.title}`);
            return false;
        }

        let anySuccess = false;

        for (let i = 0; i < imageTypes.length; i++) {

            const type = imageTypes[i];

            onProgress?.(
                i + 1,
                imageTypes.length,
                `Downloading ${SteamGridImageType[type]} for ${game.title}`
            );

            try {

                const success = await fetchAndAssignSingleImage(
                    game,
                    bestMatch.id,
                    type,
                    onlyMissing
                );

                if (success) {
                    anySuccess = true;

                    console.log(
                        `Downloaded ${SteamGridImageType[type]} for ${game.title}`
                    );
                }

            } catch (err) {

                console.error(
                    `Failed downloading ${SteamGridImageType[type]} for ${game.title}`,
                    err
                );
            }
        }

        if (anySuccess) {

            await saveGame(game);
            dispatchImagesUpdatedEvent();
        }

        return anySuccess;

    } catch (err) {

        console.error(
            `Error fetching images for game ${gameId}`,
            err
        );

        return false;
    }
}

// ====================================================================================
// BULK
// ====================================================================================

export async function fetchImagesForGameList(
    gameIds: string[],
    imageTypes?: SteamGridImageType[],
    onProgress?: ProgressCallback
): Promise<{ success: number; failed: number }> {

    let success = 0;
    let failed = 0;

    const total = gameIds.length;

    for (let i = 0; i < total; i++) {

        const gameId = gameIds[i];

        const game = await getGameData(gameId);

        const title = game?.title || gameId;

        onProgress?.(
            i + 1,
            total,
            `Processing ${title}`
        );

        try {

            const ok = await fetchAllGameImages(
                gameId,
                imageTypes
            );

            if (ok)
                success++;
            else
                failed++;

        } catch {

            failed++;
        }
    }

    return { success, failed };
}

export async function fetchImagesForCategories(
    categoryIds: string[],
    imageTypes?: SteamGridImageType[],
    onProgress?: (
        current: number,
        total: number,
        gameTitle: string
    ) => void
): Promise<{ success: number; failed: number }> {

    const gameIds = await getGameIdsByCategory(
        categoryIds
    );

    if (!gameIds.length)
        return {
            success: 0,
            failed: 0
        };

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

        onProgress?.(
            i + 1,
            total,
            game.title
        );

        try {

            const ok = await fetchAllGameImages(
                gameId,
                imageTypes
            );

            if (ok)
                success++;
            else
                failed++;

        } catch {

            failed++;
        }
    }

    return { success, failed };
}