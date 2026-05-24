//STELLARHUB RENDERER - Punto de entrada principal para la interfaz de usuario
// Aquí se inicializa la aplicación, se cargan los juegos y se renderizan los layouts según el modo (fullscreen o desktop)



// Cargar tipos y funciones compartidos
import { getUIMode, onUIModeChange, toggleFullscreenUI } from './services/uiMode'; // Funciones para manejar el modo UI
import { renderDesktopLayout } from './layouts/DesktopLayout'; // Importar función para renderizar el layout de escritorio
import { renderFullscreenLayout } from './layouts/FullscreenLayout'; // Importar función para renderizar el layout de fullscreen
import { setUIMode } from './services/uiMode'; // Funcion para setear el modo UI desde la configuración
import { startGamepadListening, stopGamepadListening } from './services/gamepad'; // Funciones para manejar gamepad

//Importar bootstrap-icons
import 'bootstrap-icons/font/bootstrap-icons.css';


//Cargar estilos globales
import './styles/base.css';
import './styles/fullscreen.css';
import './styles/desktop.css';
import './styles/components/game-card.css';
import './styles/components/modal.css';

//Cargar componentes
import './components/desktop/DesktopMenu';

// ----------------------------------------------
// GAMEPAD NAVEGATION (fullscreen)
// ----------------------------------------------
let currentSelectedIndex = 0;
let cleanupGamepad: (() => void) | null = null;
//COOLDOWN TO MOVE GAMEPAD ON FULLSCREEN
const MOVE_COOLDOWN_MS = 200; // milisegundos entre cambios
let lastMoveTime = 0;
//COOLDOWN TO OPEN GAME
const ACCEPT_COOLDOWN_MS = 500; // medio segundo
let lastAcceptTime = 0;
let isFullscreenActive = false;

function updateSelection() {
  const cards = document.querySelectorAll('.game-card');
  let gameChanged = false;

  cards.forEach((card, idx) => {
    if (idx === currentSelectedIndex) {
      // Verificar si realmente estamos cambiando de juego antes de aplicar la clase
      if (!card.classList.contains('selected')) {
        gameChanged = true;
      }
      card.classList.add('selected');

      window.dispatchEvent(new CustomEvent('game-selected', {
        bubbles: true,
        composed: true,
        detail: card.getAttribute('data-game-id')
      }));
    } else {
      card.classList.remove('selected');
    }
  });

  const selectedCard = cards[currentSelectedIndex] as HTMLElement;
  if (selectedCard) {
    selectedCard.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });

    // ANIMACIÓN CINEMATOGRÁFICA DE IMÁGENES
    if (gameChanged) {
      const bg = document.querySelector('.fs-background') as HTMLElement;
      const heroImage = document.getElementById('fs-image') as HTMLImageElement;
      const heroLogo = document.getElementById('fs-logo') as HTMLImageElement;

      // 1. Apagamos sutilmente el fondo y preparamos el logo/banner
      if (bg) bg.style.opacity = '0.05';
      if (heroImage) heroImage.classList.add('fs-image-changing');
      if (heroLogo) heroLogo.classList.add('fs-logo-changing');

      // 2. Esperamos a que el navegador procese el cambio de imágenes (un pequeño delay)
      setTimeout(() => {
        // Aquí tu código ya habrá cambiado el src del bg, image y logo.
        // Removemos las clases para que entren con la animación suave de CSS
        if (bg) bg.style.opacity = '0.15';
        if (heroImage) heroImage.classList.remove('fs-image-changing');
        if (heroLogo) heroLogo.classList.remove('fs-logo-changing');
      }, 150); // 150ms es el "sweet spot" ideal para no generar lag visual
    }
  }
}

function moveSelection(delta: number) {
  const cards = document.querySelectorAll('.game-card');
  if (cards.length === 0) return;
  const now = Date.now();
  if (now - lastMoveTime < MOVE_COOLDOWN_MS) return;
  lastMoveTime = now;
  currentSelectedIndex = (currentSelectedIndex + delta + cards.length) % cards.length;
  updateSelection();
}

function handleGamepadDirection(dx: number, dy: number, buttons: readonly GamepadButton[]) {
  let delta = 0;
  // Stick izquierdo horizontal
  if (Math.abs(dx) > 0.5) {
    delta = dx > 0 ? 1 : -1;
  } else {
    // D-pad (botones estándar: izquierda=14, derecha=15)
    if (buttons[14]?.pressed) delta = -1;
    else if (buttons[15]?.pressed) delta = 1;
  }
  if (delta !== 0) {
    moveSelection(delta);
  }
}


function handleVisibilityChange() {
  if (document.hidden) {
    manageGamepadListening(false); // Ventana oculta/otra pestaña -> Apagar
  } else {
    manageGamepadListening(true);  // Ventana visible de nuevo -> Encender
  }
}

function handleWindowBlur() {
  manageGamepadListening(false); // Clic fuera de la app/otra app encima -> Apagar
}

function handleWindowFocus() {
  manageGamepadListening(true);  // Clic de vuelta en la app -> Encender
}

function manageGamepadListening(activate: boolean) {
  if (activate && isFullscreenActive) {
    // Solo iniciamos si la pantalla completa está activa Y la ventana tiene foco
    startGamepadListening({
      onDirectionChange: handleGamepadDirection,
      onAccept: () => {
        const now = Date.now();
        if (now - lastAcceptTime < ACCEPT_COOLDOWN_MS) return;
        lastAcceptTime = now;
        const cards = document.querySelectorAll('.game-card');
        const gameId = cards[currentSelectedIndex]?.getAttribute('data-game-id');
        if (gameId) launchGame(gameId);
      },
      onBack: () => toggleFullscreenUI(),
      onHome: () => toggleFullscreenUI(),
    });
  } else {
    // Si pierde el foco o se cierra la UI, apagamos el listener del gamepad por completo
    stopGamepadListening();
  }
}

export function setupFullscreenGamepad() {
  isFullscreenActive = true;

  if (cleanupGamepad) {
    cleanupGamepad();
    cleanupGamepad = null;
  }

  // Encendemos el gamepad inicialmente
  manageGamepadListening(true);

  // Escuchamos cuando el usuario cambia de pestaña o minimiza
  document.addEventListener('visibilitychange', handleVisibilityChange);
  // Escuchamos cuando el usuario hace clic en otra aplicación (pierde foco)
  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('focus', handleWindowFocus);

  // Nuestra función de limpieza ahora también remueve estos listeners de la ventana
  cleanupGamepad = () => {
    isFullscreenActive = false;
    manageGamepadListening(false);

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
  };

  requestAnimationFrame(updateSelection);
}

async function initLayoutFromSettings() {
  const settings = await window.electronAPI.invoke('get-app-settings');
  if (settings.launchInFullscreen) {
    console.log('Launching in fullscreen mode');
    // Activar fullscreen nativo y modo UI
    await document.documentElement.requestFullscreen();
    setUIMode('fullscreen');
  } else {
    console.log('Launching in desktop mode');
    setUIMode('desktop');
  }
  renderCurrentLayout(); // ahora renderiza con el modo inicial
}


// Función para obtener juegos desde el backend
async function fetchGames() {
  const games = await window.electronAPI.invoke('get-games-summary');
  return games;
}

// Función para lanzar juego
async function launchGame(gameId: string) {
  const result = await window.electronAPI.invoke('launch-game-by-id', gameId);
  if (!result.success) {
    console.error('Error launching game:', result.error);
    // Aquí podrías mostrar un toast/notificación
  }
}

let currentLayout: DocumentFragment | null = null;

// Renderiza el layout según el modo actual
async function renderCurrentLayout() {
  const games = await fetchGames();
  const mode = getUIMode();
  const appContainer = document.querySelector('#div-app') as HTMLElement;

  if (mode === 'desktop') {
    currentLayout = await renderDesktopLayout(games);
    appContainer.replaceChildren(currentLayout);

    stopGamepadListening(); // Aseguramos que el gamepad no escuche en modo escritorio    
  } else {
    currentLayout = await renderFullscreenLayout(games);
    appContainer.replaceChildren(currentLayout);

    // Configurar gamepad solo en modo fullscreen
    setupFullscreenGamepad();
  }

}

onUIModeChange(async (mode) => {
  setUIMode(mode)
  await renderCurrentLayout()
})

window.addEventListener('toggle-fullscreen', async () => {
  await toggleFullscreenUI();
});

// Tecla F11
window.addEventListener('keydown', (e) => {
  if (e.key === 'F11') {
    e.preventDefault();
    toggleFullscreenUI();
  }
});



initLayoutFromSettings();


//PROVISIONAL /// REWORK DE MANDO COMPLETAMENTE, TODO JUNTO ACA NO ENTIENDO ANDA
// Teclado: flechas izquierda/derecha (y opcional arriba/abajo para grid futuro)
window.addEventListener('keydown', (e) => {
  const mode = getUIMode();
  if (mode !== 'fullscreen') return;
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    moveSelection(-1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    moveSelection(1);
  }
});