import { contextBridge, ipcRenderer } from 'electron';

// Exponemos APIs seguras al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, data?: any) => ipcRenderer.invoke(channel, data),
  quitApp: () => ipcRenderer.send('app-quit'),
  onGameExited: (callback: (gameId: string) => void) => {
    ipcRenderer.on('game-exited', (_, gameId) => callback(gameId));
  },
  onBackgroundTask: (callback: (event: any) => void) => {
    ipcRenderer.on('background-task', (_, data) => callback(data));
  },  
  removeBackgroundTaskListener: () => {
    ipcRenderer.removeAllListeners('background-task');
  }
});