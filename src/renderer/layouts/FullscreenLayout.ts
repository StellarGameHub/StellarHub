import { GameSummary } from '../../shared/types';
import fullscreenLayoutHTML from './fullscreen-layout.html?raw';

export function renderFullscreenLayout(games: GameSummary[], onPlayGame: (id: string) => void) {
    const container = document.createElement('div');
    container.className = 'fs-layout';
    container.innerHTML = fullscreenLayoutHTML;

    const grid = container.querySelector('#fs-grid') as HTMLElement;
    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'fs-game-card';
        card.setAttribute('data-id', game.id);
        card.innerHTML = `
      <img src="${game.gameImages?.cover || '/assets/default-cover.png'}" alt="${game.title}">
      <span>${game.title}</span>
    `;
        card.addEventListener('click', () => onPlayGame(game.id));
        grid.appendChild(card);
    });

    const exitBtn = container.querySelector('#btn-toggle-fs') as HTMLButtonElement;
    exitBtn.addEventListener('click', () => {
        // Salir del fullscreen (desde uiMode)
        import('../services/uiMode').then(({ toggleFullscreenUI }) => {
            toggleFullscreenUI();
        });
    });

    return container;
}