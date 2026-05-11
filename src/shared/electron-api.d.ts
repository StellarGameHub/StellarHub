export interface ElectronAPI {
  invoke(channel: string, data?: any): Promise<any>;
  quitApp(): void;
  onGameExited(callback: (gameId: string) => void): void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export { };