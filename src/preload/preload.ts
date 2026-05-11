import { contextBridge, ipcRenderer } from 'electron';

// Exponemos APIs seguras al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, data?: any) => ipcRenderer.invoke(channel, data),
  quitApp: () => ipcRenderer.send('app-quit'),
  onGameExited: (callback: (gameId: string) => void) => {
    ipcRenderer.on('game-exited', (_, gameId) => callback(gameId));
  }
});