import { GameSummary } from '../../shared/types';
import { GameCard } from '../components/shared/GameCard';
import { GameSource } from '../../shared/enums';
import desktopLayoutHTML from './desktop-layout.html?raw';

export function renderDesktopLayout(games: GameSummary[]): DocumentFragment {

    // Agregar juegos de prueba
    // games.push({
    //     id: 'test-game',
    //     title: 'Test Game',
    //     isInstalled: true,
    //     addedAt: new Date(),
    //     lastPlayedAt: new Date(),        
    //     playtimeMinutes: 120,
    //     releaseYear: 2020,
    //     developer: 'Test Devs',
    //     source: GameSource.MANUAL, // GameType.manual
    //     gameImages:{
    //         grid : 'images/grid/1102f2b0-6990-4268-99a3-e4d3912d4c98.webp',
    //         cover: '',
    //         background: '',
    //         banner: '',
    //     }
    // });

    const template = document.createElement('template');
    template.innerHTML = desktopLayoutHTML;    

    const content = template.content;

    const grid = content.querySelector('#ds-grid') as HTMLElement;

    console.log('Games to render:', games);

    games.forEach(game => {
        console.log('Rendering game:', game.title);
        const card = document.createElement('game-card') as GameCard;
        card.game = game; // Esto asigna el juego y llama a render() dentro del componente
        console.log('Created card for game:', game.title, 'card element:', card);
        grid.appendChild(card);
    });

    const fullscreenBtn = content.querySelector('.button-toggle-fullscreen') as HTMLButtonElement;
    fullscreenBtn.addEventListener('click', () => {
        // Entrar al modo fullscreen (desde uiMode)
        import('../services/uiMode').then(({ toggleFullscreenUI }) => {
            toggleFullscreenUI();
        });
    });

    return content;
}