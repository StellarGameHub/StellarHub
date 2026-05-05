// src/main/services/libraryService.ts
import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { GameDetail, LaunchConfig } from '../../shared/types';

// --- Helpers de Rutas ---
function getGamesFilePath(): string {
    // app.getPath('userData') seguirá las directrices XDG en Linux (~/.config/estelarhub/)
    const userDataPath = app.getPath('userData');
    // Asegura que la carpeta exista (muy importante)
    fs.mkdir(userDataPath, { recursive: true }).catch(err => console.error('Error creating config dir:', err));
    return path.join(userDataPath, 'games.json');
}

// --- Funciones CRUD (Create, Read, Update, Delete) ---
export async function getGames(): Promise<GameDetail[]> {
    const filePath = getGamesFilePath();
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // Si el archivo no existe, devolvemos una lista vacía
            return [];
        }
        console.error('Error reading games file:', error);
        throw error;
    }
}

async function saveGames(games: GameDetail[]): Promise<void> {
    const filePath = getGamesFilePath();
    await fs.writeFile(filePath, JSON.stringify(games, null, 2));
}

export async function getGame(id: string): Promise<GameDetail | undefined> {
    const games = await getGames();
    return games.find(game => game.id === id);
}

export async function saveGame(game: GameDetail): Promise<void> {
    const games = await getGames();
    const index = games.findIndex(g => g.id === game.id);
    if (index !== -1) {
        games[index] = game;
    } else {
        games.push(game);
    }
    await saveGames(games);
}

export async function updatePlaytime(gameId: string, additionalMinutes: number): Promise<void> {
    const game = await getGame(gameId);
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
    const game = await getGame(gameId);
    return game?.launchConfig;
}