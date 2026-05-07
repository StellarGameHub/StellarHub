// src/main/services/libraryService.ts
import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { Game, ExecutableGame, LaunchConfig } from '../../shared/types';
import { GameSource } from '../../shared/enums';

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

export async function deleteGame(gameID: string) {
    const games = await getGames();
    const gameIndex = games.findIndex(g => g.id == gameID)

    if (gameIndex === -1) {
        console.warn(`attempt to delete non-existent game, with ID: ${gameID}`)
    } else {
        games.splice(gameIndex, 1);
        await saveGames(games);
    }
}

export async function updatePlaytime(gameID: string, additionalMinutes: number): Promise<void> {
    const game = await getGameData(gameID);
    if (game) {
        game.playtimeMinutes += additionalMinutes;
        game.lastPlayedAt = new Date();
        await saveGame(game);
    }
}

/**
 * Obtiene únicamente la configuración de lanzamiento de un juego.
 * @param gameId ID del juego
 * @returns La configuración de lanzamiento o undefined si el juego no existe
 */
export async function getLaunchConfig(gameId: string): Promise<LaunchConfig | undefined> {
    const game = await getGameData(gameId);
    
    if (game?.source == GameSource.MANUAL || game?.source == GameSource.STEAM || game?.source == GameSource.GOG) {
        return (game as ExecutableGame).launchConfig;
    }    
}