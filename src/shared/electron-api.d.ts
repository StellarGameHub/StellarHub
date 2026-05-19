// src/renderer/electron-api.d.ts

export interface ElectronAPI {
  /**
   * Invoca un manejador IPC registrado en el proceso principal.
   * @template T El tipo de dato que la función debe devolver.
   * @param channel El nombre del canal IPC.
   * @param data Los datos a enviar (opcional).
   * @returns Una promesa que se resuelve con la respuesta del proceso principal.
   */
  invoke<T = any>(channel: string, data?: any): Promise<T>;

  /**
   * Registra un callback para el evento 'game-exited'.
   * @param callback Función que se ejecutará cuando un juego termine.
   */
  onGameExited(callback: (gameId: string) => void): void;

  /**
   * Registra un callback para el evento 'background-task'.
   * @param callback Función que se ejecutará para reportar el progreso de tareas en segundo plano.
  */
  onBackgroundTask(callback: (taskEvent: { taskId: string; type: string; message: string; progress?: number; error?: string }) => void): void;


  quitApp(): void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}