
import '../components/GameCard';   // esto ejecuta el código que hace customElements.define
import { GameSummary } from '../../shared/types';
import desktopLayoutHTML from './desktop-layout.html?raw';
import { GameCard } from '../components/GameCard';


export function renderDesktopLayout(games: GameSummary[], onPlayGame: (id: string) => void) {


    // Agregar juegos de prueba
    // games.push({
    //     id: 'test-game',
    //     title: 'Test Game',
    //     isInstalled: true,
    //     isHidden: false,
    //     playtimeMinutes: 120,
    //     releaseYear: 2020,
    //     developer: 'Test Devs',
    //     source: 0, // GameType.manual
    // });

    const container = document.createElement('div');
    container.innerHTML = desktopLayoutHTML;

    const grid = container.querySelector('#ds-grid') as HTMLElement;

    console.log('Games to render:', games);

    games.forEach(game => {
        console.log('Rendering game:', game.title);
        const card = document.createElement('game-card') as GameCard;
        card.game = game; // Esto asigna el juego y llama a render() dentro del componente
        console.log('Created card for game:', game.title, 'card element:', card);
        grid.appendChild(card);
    });

    const fullscreenBtn = container.querySelector('.button-toggle-fullscreen') as HTMLButtonElement;
    fullscreenBtn.addEventListener('click', () => {
        // Entrar al modo fullscreen (desde uiMode)
        import('../services/uiMode').then(({ toggleFullscreenUI }) => {
            toggleFullscreenUI();
        });
    });

    return container;
}