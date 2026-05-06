//STELLARHUB RENDERER - Punto de entrada principal para la interfaz de usuario
// Aquí se inicializa la aplicación, se cargan los juegos y se renderizan los layouts según el modo (fullscreen o desktop)



// Cargar tipos y funciones compartidos
import { getUIMode, onUIModeChange, toggleFullscreenUI } from './services/uiMode'; // Funciones para manejar el modo UI
import { renderDesktopLayout } from './layouts/DesktopLayout'; // Importar función para renderizar el layout de escritorio
import { renderFullscreenLayout } from './layouts/FullscreenLayout'; // Importar función para renderizar el layout de fullscreen
import { setUIMode } from './services/uiMode'; // Funcion para setear el modo UI desde la configuración
import { initAddGameModal } from './components/AddGameModal'; // Inicializar modal de agregar juego
import { startGamepadListening, stopGamepadListening } from './services/gamepad'; // Funciones para manejar gamepad

//Cargar estilos globales
import './styles/base.css';
import './styles/fullscreen.css';
import './styles/components/game-card.css';
import './styles/components/modal.css';
import './styles/components/grid.css';

// Configuración específica del gamepad para el modo fullscreen (se llama cada vez que se entra a ese modo)
let currentSelectedIndex = 0;
let cleanupGamepad: (() => void) | null = null;

export function setupFullscreenGamepad() {
  // Limpiar listener anterior si existe
  if (cleanupGamepad) {
    cleanupGamepad();
    cleanupGamepad = null;
  }

  // Función para actualizar la selección visual (se re-ejecuta tras re-render)
  const updateSelection = () => {
    const cards = document.querySelectorAll('.fs-game-card');
    cards.forEach((card, idx) => {
      if (idx === currentSelectedIndex) card.classList.add('selected');
      else card.classList.remove('selected');
    });
    // Scroll al elemento seleccionado si está fuera de vista
    const selectedCard = cards[currentSelectedIndex] as HTMLElement;
    if (selectedCard) {
      selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Iniciar escucha de gamepad con callbacks
  startGamepadListening({ 
    onDirectionChange: (dx, dy) => {
      // Movimiento horizontal (left stick X)
      if (Math.abs(dx) > 0.5) {
        const cards = document.querySelectorAll('.fs-game-card');
        if (cards.length === 0) return;
        currentSelectedIndex = (currentSelectedIndex + (dx > 0 ? 1 : -1) + cards.length) % cards.length;
        updateSelection();
      }
      // Opcional: movimiento vertical si quisieras grid 2D
    },
    onAccept: () => {
      const cards = document.querySelectorAll('.fs-game-card');
      const gameId = cards[currentSelectedIndex]?.getAttribute('data-id');
      if (gameId) launchGame(gameId);
    },
    onBack: () => {
      toggleFullscreenUI(); // Salir del fullscreen
    },
  });

  // Guardar función de limpieza
  cleanupGamepad = () => {
    stopGamepadListening();
  };

  // Actualizar selección después de que el DOM se haya pintado
  requestAnimationFrame(updateSelection);
}

async function initFromSettings() {
  const settings = await window.electronAPI.invoke('get-settings');
  if (settings.launchInFullscreen) {
    // Activar fullscreen nativo y modo UI
    await document.documentElement.requestFullscreen();
    setUIMode('fullscreen');    
  } else {
    initAddGameModal(); // Inicializar modal de agregar juego
    setUIMode('desktop');
  }
  renderCurrentLayout(); // ahora renderiza con el modo inicial
}

let currentLayout: HTMLElement | null = null;

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

// Renderiza el layout según el modo actual
async function renderCurrentLayout() {
  const games = await fetchGames();
  const mode = getUIMode();
  const appContainer = document.getElementById('app-container') || document.body;

  // Limpiar layout anterior
  if (currentLayout) {
    appContainer.removeChild(currentLayout);
  }

  if (mode === 'desktop') {
    currentLayout = renderDesktopLayout(games, launchGame);
    stopGamepadListening(); // Aseguramos que el gamepad no escuche en modo escritorio
  } else {
    currentLayout = renderFullscreenLayout(games, launchGame);
    // Configurar gamepad solo en modo fullscreen
    setupFullscreenGamepad();
  }

  appContainer.appendChild(currentLayout);
}

// Escuchar cambios de modo (fullscreen/desktop)
onUIModeChange(() => {    
  renderCurrentLayout();
});

// Botón de alternar fullscreen (desde el escritorio)
const fullscreenBtn = document.getElementById('fullscreen-btn');
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => toggleFullscreenUI());
}

// Tecla F11
window.addEventListener('keydown', (e) => {
  if (e.key === 'F11') {
    e.preventDefault();
    toggleFullscreenUI();
  }
});


initFromSettings();