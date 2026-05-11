// src/renderer/services/gameSessionService.ts

type EventMap = {
    'game-started': (gameId: string, pid: number) => void;
    'game-stopped': (gameId: string) => void;
};

type Listener = (...args: any[]) => void;

class GameSessionService {
    private runningGames = new Map<string, number>(); // gameId -> pid
    private listeners: Map<keyof EventMap, Set<Listener>> = new Map();

    constructor() {
        // Escuchar cuando el backend notifica que un juego terminó
        window.electronAPI.onGameExited((exitedGameId: string) => {
            if (this.runningGames.has(exitedGameId)) {
                const pid = this.runningGames.get(exitedGameId);
                this.runningGames.delete(exitedGameId);
                this.emit('game-stopped', exitedGameId);
            }
        });
    }

    // Suscripción a eventos
    on<K extends keyof EventMap>(event: K, callback: EventMap[K]): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback as Listener);
    }

    off<K extends keyof EventMap>(event: K, callback: EventMap[K]): void {
        this.listeners.get(event)?.delete(callback as Listener);
    }

    private emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void {
        this.listeners.get(event)?.forEach(cb => cb(...args));
    }

    // Lanzar juego
    async launchGame(gameId: string): Promise<{ success: boolean; error?: string }> {

        if (this.runningGames.has(gameId)) {
            console.warn(`Game ${gameId} is already running`);
            return { success: false, error: 'Already running' };
        }

        const result = await window.electronAPI.invoke('launch-game-by-id', gameId);
        if (result.success && result.pid) {
            this.runningGames.set(gameId, result.pid);
            this.emit('game-started', gameId, result.pid);
            return { success: true };
        } else {
            console.error(`[GameSession] Error launching ${gameId}:`, result.error);
            return { success: false, error: result.error };
        }
    }

    // Detener juego específico
    async stopGame(gameId: string): Promise<{ success: boolean }> {
        if (!this.runningGames.has(gameId)) {
            console.warn(`[GameSession] Game ${gameId} is not running`);
            return { success: false };
        }
        await window.electronAPI.invoke('kill-game', gameId);
        // El estado se actualizará cuando llegue 'game-exited' desde el backend
        return { success: true };
    }

    // Consultar si un juego específico está en ejecución
    isGameRunning(gameId: string): boolean {
        return this.runningGames.has(gameId);
    }

    // Obtener lista de juegos activos
    getRunningGames(): Map<string, number> {
        return new Map(this.runningGames);
    }
}

export const gameSession = new GameSessionService();