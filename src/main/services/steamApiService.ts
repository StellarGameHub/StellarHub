import axios from 'axios';

export interface SteamOwnedGame {
    appid: number;
    name: string;
    playtime_forever: number;      // minutos totales jugados
    img_icon_url?: string;
    has_community_visible_stats?: boolean;
    playtime_windows_forever?: number;
    playtime_mac_forever?: number;
    playtime_linux_forever?: number;
    rtime_last_played?: number;     // timestamp de la última vez que se jugó
}

interface SteamGetOwnedGamesResponse {
    response: {
        game_count: number;
        games: SteamOwnedGame[];
    };
}

/**
 * Obtiene la lista de juegos que posee el usuario de Steam.
 * @param steamId ID de Steam del usuario (64 bits)
 * @param apiKey API Key de Steam
 * @returns Array de juegos con metadatos
 */
export async function fetchOwnedGames(steamId: string, apiKey: string): Promise<SteamOwnedGame[]> {
    const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/`;
    const params = {
        key: apiKey,
        steamid: steamId,
        include_appinfo: true,          // incluye nombre, icono, etc.
        include_played_free_games: true, // incluye juegos gratuitos jugados
        format: 'json'
    };
    try {
        const response = await axios.get<SteamGetOwnedGamesResponse>(url, { params });
        return response.data.response.games || [];
    } catch (error) {
        console.error('[SteamAPI] Error fetching owned games:', error);
        throw error;
    }
}

/**
 * Obtiene los juegos jugados recientemente por el usuario.
 * No es estrictamente necesario para la sincronización inicial, pero puede ser útil.
 */
export async function fetchRecentlyPlayedGames(steamId: string, apiKey: string) {
    const url = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/`;
    const params = {
        key: apiKey,
        steamid: steamId,
        count: 10,
        format: 'json'
    };
    try {
        const response = await axios.get(url, { params });
        return response.data.response?.games || [];
    } catch (error) {
        console.error('[SteamAPI] Error fetching recently played games:', error);
        return [];
    }
}