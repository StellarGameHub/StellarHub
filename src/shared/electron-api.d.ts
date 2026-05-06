// src/renderer/electron-api.d.ts
export interface ElectronAPI {
  invoke(channel: string, data?: any): Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}