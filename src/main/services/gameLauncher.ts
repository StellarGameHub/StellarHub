// src/main/services/gameLauncherService.ts
import { spawn } from 'child_process';
import { LaunchConfig } from '../../shared/types';
import { updatePlaytime } from './libraryService'; // <-- Importa la función

export async function launchGame(gameId: string, config: LaunchConfig): Promise<void> {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const args = [config.executablePath];
        if (config.launchArgs && config.launchArgs.length) {
            args.push(...config.launchArgs);
        }

        const child = spawn('umu-run', args, {
            env: { ...process.env, ...buildEnv(config) },
            detached: true,
            stdio: 'ignore',
        });

        child.on('error', (err) => {
            reject(err);
        });

        child.on('spawn', () => {
            resolve();
        });

        // --- Evento 'exit' para guardar el tiempo jugado ---
        child.on('exit', (code, signal) => {
            const endTime = Date.now();
            const durationMinutes = Math.floor((endTime - startTime) / 60000);
            if (durationMinutes > 0) {
                // Llama a la función de libraryService para actualizar el tiempo
                updatePlaytime(gameId, durationMinutes).catch(err => {
                    console.error(`Failed to update playtime for game ${gameId}:`, err);
                });
            }
            console.log(`Game ${gameId} exited. Duration: ${durationMinutes} min.`);
        });
    });
}

// buildEnv se mantiene igual que en ejemplos anteriores
function buildEnv(config: LaunchConfig): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {
        GAMEID: config.gameId || '',
        STORE: config.store || '',
        PROTONPATH: config.protonVersion || '',
        WINEPREFIX: config.winePrefix || '',
    };
    if (config.enableMangoHud) env.MANGOHUD = '1';
    if (config.enableGamescope) {
        let gamescopeCmd = 'gamescope';
        if (config.gamescopeArgs?.length) gamescopeCmd += ` ${config.gamescopeArgs.join(' ')}`;
        env.GAMESCOPE_CMD = gamescopeCmd;
    }
    return env;
}