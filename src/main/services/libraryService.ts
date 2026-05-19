// src/main/services/libraryService.ts
import { app, shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { Game, ExecutableGame, LaunchConfig, GameSummary, SteamGame } from '../../shared/types';
import { GameCompletionStatus, GameSource } from '../../shared/enums';
import { deleteGameImages } from './imageService';
import { fetchAllGameImages } from '../services/imageFetcher';
import { fetchGameDataFromWikidata } from './gameDataFetcher';
import { LocalSteamGame } from './steamLocalScanner';
import { launchEmulator, launchSteamGame } from './gameLauncher';

// --- Helpers de Rutas ---
function getGamesFilePath(): string {
    // app.getPath('userData') seguirá las directrices XDG en Linux (~/.config/estelarhub/)
    const userDataPath = app.getPath('userData');
    // Asegura que la carpeta exista (muy importante)
    fs.mkdir(userDataPath, { recursive: true }).catch(err => console.error('Error creating config dir:', err));
    return path.join(userDataPath, 'games.json');
}

// --- Funciones CRUD (Create, Read, Update, Delete) ---
export async function getGames(): Promise<Game[]> {
    const filePath = getGamesFilePath();
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        const games = JSON.parse(data);
        return games as Game[];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // Si el archivo no existe, devolvemos una lista vacía
            return [];
        }
        console.error('Error reading games file:', error);
        throw error;
    }
}


export async function getGameData(id: string): Promise<Game | undefined> {
    const games = await getGames();
    return games.find(game => game.id === id);
}

export async function saveGame(game: Game): Promise<void> {
    const games = await getGames();
    const index = games.findIndex(g => g.id === game.id);
    if (index !== -1) games[index] = game;
    else games.push(game);
    await saveGames(games);
}

export async function saveGames(games: Game[]): Promise<void> {
    const filePath = getGamesFilePath();
    await fs.writeFile(filePath, JSON.stringify(games, null, 2));
}

export async function deleteGame(gameId: string) {
    const games = await getGames();
    const gameIndex = games.findIndex(g => g.id == gameId)

    if (gameIndex === -1) {
        console.warn(`attempt to delete non-existent game, with ID: ${gameId}`)
    } else {
        await deleteGameImages(gameId);
        games.splice(gameIndex, 1);
        await saveGames(games);
    }
}

/**
 * Inicia la instalación de un juego en Steam (si no está instalado).
 * @param gameId ID interno del juego
 * @returns true si se pudo abrir el enlace de Steam, false si no
 */
export async function installGame(gameId: string): Promise<boolean> {
    const game = await getGameData(gameId);
    if (!game) {
        console.error(`[installGame] Juego ${gameId} no encontrado`);
        return false;
    }

    if (game.source === GameSource.STEAM && (game as SteamGame).steamAppId) {
        const steamUrl = `steam://install/${(game as SteamGame).steamAppId}`;
        console.log(`[installGame] Abriendo ${steamUrl}`);
        await shell.openExternal(steamUrl);
        return true;
    }

    // Para otros tipos de juego (manual, ROM), podríamos abrir el directorio o mostrar un diálogo.
    // Por ahora solo soportamos Steam.
    console.warn(`[installGame] No se puede instalar el juego ${gameId} (source: ${game.source})`);
    return false;
}

export async function updatePlaytime(gameId: string, additionalMinutes: number): Promise<void> {
    const game = await getGameData(gameId);
    if (game) {
        game.playtimeMinutes += additionalMinutes;
        game.lastPlayedAt = new Date();
        await saveGame(game);
    }
}

/**
 * Get only the Game LaunchConfig
 * @param gameId Game ID
 * @returns LaunchConfig or undefined if game does not exists
 */
export async function getLaunchConfig(gameId: string): Promise<LaunchConfig | undefined> {
    const game = await getGameData(gameId);

    if (game?.source == GameSource.MANUAL || game?.source == GameSource.STEAM || game?.source == GameSource.GOG) {
        return (game as ExecutableGame).launchConfig;
    }
}

export async function getGameIdsByCategory(categoryIds: string[]): Promise<string[]> {
    const games = await getGames();
    return games
        .filter(game => game.categories?.some(catId => categoryIds.includes(catId)))
        .map(game => game.id);
}



export async function addManualGame(gameData: ExecutableGame): Promise<string> {
    const newId = crypto.randomUUID();

    const fetchedGameData = await fetchGameDataFromWikidata(gameData.title);

    console.log("Wikidatainfo: ", fetchedGameData);

    if (fetchedGameData?.developer != null) gameData.developers = [fetchedGameData?.developer];
    if (fetchedGameData?.description != null) gameData.description = fetchedGameData.description;
    if (fetchedGameData?.genres != null) gameData.genres = fetchedGameData.genres;
    if (fetchedGameData?.releaseDate != null) gameData.releaseDate = new Date(fetchedGameData.releaseDate);
    if (fetchedGameData?.publisher != null) gameData.publishers = [fetchedGameData.publisher]

    const newGame: ExecutableGame = {
        ...gameData,
        id: newId,
        addedAt: new Date(),
        playtimeMinutes: 0,
        source: GameSource.MANUAL,
    };

    await saveGame(newGame);
    await fetchAllGameImages(newGame.id);

    return newId;
}

export async function addSteamGame(sg: LocalSteamGame): Promise<string> {
    const newId = crypto.randomUUID();

    const steamGame: SteamGame = {
        id: newId,
        installPath: sg.installDir,
        title: sg.name,
        steamAppId: sg.appId,
        source: GameSource.STEAM,
        isInstalled: true,
        isHidden: false,
        gameImages: {

        },
        playtimeMinutes: 0,
        addedAt: new Date(),
        completionStatus: GameCompletionStatus.PENDING,
    }

    const fetchedGameData = await fetchGameDataFromWikidata(sg.name);

    if (fetchedGameData?.developer != null) steamGame.developers = [fetchedGameData?.developer];
    if (fetchedGameData?.description != null) steamGame.description = fetchedGameData.description;
    if (fetchedGameData?.genres != null) steamGame.genres = fetchedGameData.genres;
    if (fetchedGameData?.releaseDate != null) steamGame.releaseDate = new Date(fetchedGameData.releaseDate);
    if (fetchedGameData?.publisher != null) steamGame.publishers = [fetchedGameData.publisher]


    await saveGame(steamGame);
    await fetchAllGameImages(steamGame.id);

    return newId;
}