import { GameSummary } from '../../shared/types';
import { GameCard } from '../components/shared/GameCard';
import fullscreenLayoutHTML from './fullscreen-layout.html?raw';

export function renderFullscreenLayout(games: GameSummary[]): DocumentFragment {
    const template = document.createElement('template');
    template.innerHTML = fullscreenLayoutHTML;

    const content = template.content;

    const grid = content.querySelector('#fs-grid') as HTMLElement;

    games.forEach(game => {
        console.log('Rendering game:', game.title);
        const card = document.createElement('game-card') as GameCard;
        card.dataset.id = game.id; // Guardar ID para referencia futura
        card.game = game; // Esto asigna el juego y llama a render() dentro del componente
        console.log('Created card for game:', game.title, 'card element:', card);
        grid.appendChild(card);
    });

    const exitBtn = content.querySelector('#btn-toggle-fs') as HTMLButtonElement;
    exitBtn.addEventListener('click', () => {
        // Salir del fullscreen (desde uiMode)
        import('../services/uiMode').then(({ toggleFullscreenUI }) => {
            toggleFullscreenUI();
        });
    });

    return content;
}