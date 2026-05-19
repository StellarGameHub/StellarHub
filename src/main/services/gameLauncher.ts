// src/main/services/gameLauncherService.ts
import { spawn, ChildProcess } from 'child_process';
import { LaunchConfig, RomGame, SteamGame } from '../../shared/types';
import { BrowserWindow } from 'electron';


//Games currently running
const activeGames = new Map<string, ChildProcess>(); // gameId -> child process


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
 * Launch Manual Game using umu-run.
 */
export async function launchManualGame(
    config: LaunchConfig,
    gameId: string,
    onExit?: (durationMinutes: number) => void
): Promise<number> {
    const args = [config.executablePath];
    if (config.gameArgs && config.gameArgs.length) {
        args.push(...config.gameArgs);
    }
    const fullArgs = [...(config.launchArgs || []), ...args];
    const env = buildUmuEnv(config);

    console.log(`[GameLauncher] Lanzando ${gameId} con: umu-run ${fullArgs.join(' ')}`);
    return launchGame('umu-run', fullArgs, gameId, onExit, env);
}

/**
 * Launch ROM using Emulator
 */
export async function launchEmulator(
    romGame: RomGame,
    onExit?: (durationMinutes: number) => void
): Promise<number> {
    // Construir array de argumentos adecuadamente
    const argsTemplate = romGame.romDetails.launchArguments.split(' ');
    const gamePathIndex = argsTemplate.findIndex(x => x === '{gamePath}');
    if (gamePathIndex !== -1) {
        argsTemplate[gamePathIndex] = romGame.romDetails.romPath;
    }
    // Nota: no escapar espacios, spawn lo maneja automáticamente

    console.log(`[GameLauncher] Lanzando ROM ${romGame.id}: ${romGame.romDetails.emulatorPath} ${argsTemplate.join(' ')}`);
    return launchGame(romGame.romDetails.emulatorPath, argsTemplate, romGame.id, onExit);
}

/**
 * Lanza cualquier juego (genérico).
 * @returns El PID del proceso hijo.
 */
export async function launchGame(
    command: string,
    args: string[],
    gameId: string,
    onExit?: (durationMinutes: number) => void,
    env?: NodeJS.ProcessEnv
): Promise<number> {
    const startTime = Date.now();

    const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        env: env || process.env,
    });

    activeGames.set(gameId, child);
    const pid = child.pid!;

    child.on('exit', (code, signal) => {
        activeGames.delete(gameId);
        // Notificar a todas las ventanas
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('game-exited', gameId);
        });

        const durationMinutes = Math.floor((Date.now() - startTime) / 60000);
        console.log(`[GameLauncher] Juego ${gameId} terminado. Código: ${code}, Señal: ${signal}. Duración: ${durationMinutes} min.`);
        if (onExit) {
            onExit(durationMinutes);
        }
    });

    child.on('spawn', () => { });
    child.on('error', (err) => {
        console.error(`[GameLauncher] Error al lanzar ${gameId}:`, err);
        activeGames.delete(gameId);
    });

    // Retornamos el PID tan pronto como se pueda (no necesitamos esperar el evento 'spawn')
    // El proceso ya se está ejecutando.
    return pid;
}


/**
 * Lanza un juego de Steam.
 */
export async function launchSteamGame(
    steamGame: SteamGame,
    onExit?: (durationMinutes: number) => void
): Promise<number> {

    // usar steam -applaunch
    console.log(`[GameLauncher] Lanzando juego de Steam ${steamGame.id} con steam -applaunch ${steamGame.id}`);
    return launchGame('steam', ['-applaunch', steamGame.steamAppId.toString()], steamGame.id, onExit);
}

export function killGame(gameId: string): boolean {
    const child = activeGames.get(gameId);
    if (child && !child.killed) {
        child.kill('SIGTERM');
        return true;
    }
    return false;
}