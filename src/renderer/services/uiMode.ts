// src/renderer/services/uiMode.ts
export type UIMode = 'desktop' | 'fullscreen';

let currentMode: UIMode = 'desktop';
const listeners: ((mode: UIMode) => void)[] = [];

export function getUIMode(): UIMode {
  return currentMode;
}

export function setUIMode(mode: UIMode) {
  if (currentMode === mode) return;
  currentMode = mode;
  listeners.forEach(fn => fn(mode));
}

export function onUIModeChange(cb: (mode: UIMode) => void) {
  listeners.push(cb);
}

// Acción: alternar y gestionar fullscreen nativo
export async function toggleFullscreenUI() {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
    setUIMode('fullscreen');
    
  } else {
    await document.exitFullscreen();
    setUIMode('desktop');
  }
}

// Sincronizar con cambio de fullscreen nativo (por si el usuario pulsa F11 nativo)
window.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    setUIMode('fullscreen');
  } else {
    setUIMode('desktop');
  }
});