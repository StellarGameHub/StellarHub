// src/main/services/gameLauncherService.ts
import { spawn } from 'child_process';
import { LaunchConfig, RomGame } from '../../shared/types';

/**
 * Construye el objeto de entorno para umu-run
 */
function buildUmuEnv(config: LaunchConfig): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {
        ...process.env,
        ...(config.environment || {}),
    };

    // Variables clave para umu-launcher
    if (config.protonVersion) {
        env.PROTONPATH = config.protonVersion;
    }
    if (config.winePrefix) {
        env.WINEPREFIX = config.winePrefix;
    }
    // Um puede usar GAMEID y STORE, pero no los tenemos todavía
    // env.GAMEID = config.gameId || '';
    // env.STORE = config.store || '';

    // MangoHud
    if (config.enableMangoHud) {
        env.MANGOHUD = '1';
    }

    // Gamescope (opcional, lo dejamos para más adelante)
    if (config.enableGamescope) {
        let gamescopeCmd = 'gamescope';
        if (config.gamescopeArgs?.length) {
            gamescopeCmd += ` ${config.gamescopeArgs.join(' ')}`;
        }
        env.GAMESCOPE_CMD = gamescopeCmd;
    }

    return env;
}

/**
 * Lanza un juego usando umu-run.
 * @param config Configuración de lanzamiento
 * @param gameId ID del juego (para logging y actualización de playtime)
 * @param onExit Callback opcional que se ejecuta al salir del juego (recibe duración en minutos)
 * @returns Promesa que se resuelve cuando el proceso se inicia
 */
export async function launchManualGame(
    config: LaunchConfig,
    gameId: string,
    onExit?: (durationMinutes: number) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        // Construir la línea de comandos
        // umu-run <ejecutable> [argumentos del juego]
        const args = [config.executablePath];
        if (config.gameArgs && config.gameArgs.length) {
            args.push(...config.gameArgs);
        }

        // Si hay launchArgs (para Proton/umu), se colocan ANTES del ejecutable
        // Nota: umu-run acepta argumentos del launcher antes del ejecutable
        const fullArgs = [...(config.launchArgs || []), ...args];

        const env = buildUmuEnv(config);

        console.log(`[GameLauncher] Lanzando ${gameId} con: umu-run ${fullArgs.join(' ')}`);
        console.log(`[GameLauncher] Variables de entorno:`, env);

        const child = spawn('umu-run', fullArgs, {
            env,
            detached: true,   // el juego continúa si el launcher se cierra
            stdio: 'ignore',
        });

        child.on('error', (err) => {
            console.error(`[GameLauncher] Error al lanzar ${gameId}:`, err);
            reject(err);
        });

        child.on('spawn', () => {
            console.log(`[GameLauncher] Juego ${gameId} iniciado (PID: ${child.pid})`);
            resolve();
        });

        child.on('exit', (code, signal) => {
            const endTime = Date.now();
            const durationMinutes = Math.floor((endTime - startTime) / 60000);
            console.log(`[GameLauncher] Juego ${gameId} terminado. Código: ${code}, Señal: ${signal}. Duración: ${durationMinutes} minutos.`);
            if (onExit) {
                onExit(durationMinutes);
            }
        });
    });
}

/**
 * Lanza un juego usando emulador.
 * @param romDetails Detalles de la ROM (ruta, emulador, args)
 * @param config Configuración de lanzamiento
 * @returns Promesa que se resuelve cuando el proceso se inicia
 */
export async function launchEmulator(romGame: RomGame, onExit?: (durationMinutes: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const finalArgs = romGame.romDetails.launchArguments.replace(/\{gamePath\}/g, romGame.romDetails.romPath).split(' ');

        const child = spawn(romGame.romDetails.emulatorPath, finalArgs, {
            detached: true,
            stdio: 'ignore',
        });

        child.on('error', (err) => {
            console.error(`[GameLauncher] Error al lanzar ${romGame.romDetails.romPath}:`, err);
            reject(err);
        });

        child.on('spawn', () => {
            console.log(`[GameLauncher] ROM ${romGame.id} iniciada (PID: ${child.pid})`);
            resolve();
        });

        child.on('exit', (code, signal) => {
            const endTime = Date.now();
            const durationMinutes = Math.floor((endTime - startTime) / 60000);
            console.log(`[GameLauncher] ROM ${romGame.id} terminada. Código: ${code}, Señal: ${signal}. Duración: ${durationMinutes} minutos.`);
            if (onExit) {
                onExit(durationMinutes);
            }
        });
    }
    );
}
