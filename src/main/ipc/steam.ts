// src/main/ipc/steam.ts
import { ipcMain } from 'electron';
import { startSteamLogin } from '../services/steamAuthService';
import { getSettings, saveSettings } from '../services/settingsService';
import axios from 'axios';
import { scanInstalledSteamGames } from '../services/steamLocalScanner';

export function registerSteamHandlers() {
    // Iniciar login con Steam - version actualizada
    ipcMain.handle('steam-login', async () => {
        try {
            const callbackUrl = 'http://localhost:3000/auth/steam/callback';
            const realm = 'https://stellarhub.app';
            const steamId = await startSteamLogin(realm, callbackUrl);
            if (steamId) {
                const settings = await getSettings();
                settings.steam.clientId = steamId;
                await saveSettings(settings);
                return { success: true, steamId };
            } else {
                return { success: false, error: 'No se recibió SteamID' };
            }
        } catch (error) {
            console.error('[Steam] Error en login:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('steam-login-status', async () => {
        const settings = await getSettings();
        return { hasSteamId: !!settings.steam.clientId, hasApiKey: !!settings.steam.apiKey };
    });

    // Otros handlers (escaneo local, fetch de juegos, etc.) permanecen sin cambios
}