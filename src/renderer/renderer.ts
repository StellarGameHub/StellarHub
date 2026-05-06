import './styles/base.css';
import './styles/components/game-card.css';
import './styles/components/modal.css';
import './styles/components/grid.css';

import './components/GameCard';  // registra el custom element
import { initAddGameModal } from './components/AddGameModal';

// Función para renderizar juegos
async function renderGameGrid() {
  const games = await window.electronAPI.invoke('get-games-summary');
  const container = document.getElementById('games-grid');
  if (!container) return;
  container.innerHTML = '';
  for (const game of games) {
    const card = document.createElement('game-card');
    card.setAttribute('game-id', game.id);
    container.appendChild(card);
  }
}

window.addEventListener('games-updated', () => renderGameGrid());
initAddGameModal();
renderGameGrid();