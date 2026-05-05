import { contextBridge } from 'electron';

// Exponemos APIs seguras al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Ejemplo: getSteamGames: () => ipcRenderer.invoke('get-steam-games')
});