import { BrowserWindow } from "electron";

export function dispatchGamesUpdatedEvent() {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
        win.webContents.send('games-updated');
    });
}

export function dispatchImagesUpdatedEvent() {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
        win.webContents.send('game-images-updated');
    });
}