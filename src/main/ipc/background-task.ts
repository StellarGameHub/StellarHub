import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    onBackgroundTask: (callback: (event: any) => void) => {
        ipcRenderer.on('background-task', (_, data) => callback(data));
    },
    removeBackgroundTaskListener: () => {
        ipcRenderer.removeAllListeners('background-task');
    }
});