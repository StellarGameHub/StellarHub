import { contextBridge, ipcRenderer } from 'electron';

// Exponemos APIs seguras al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, data?: any) => ipcRenderer.invoke(channel, data),  
});