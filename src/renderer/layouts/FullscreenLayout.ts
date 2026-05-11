import { assert } from 'console';
import { Game, GameSummary } from '../../shared/types';
import { GameCard } from '../components/shared/GameCard';
import fullscreenLayoutHTML from './fullscreen-layout.html?raw';

export function renderFullscreenLayout(games: GameSummary[]): DocumentFragment {
    const template = document.createElement('template');
    template.innerHTML = fullscreenLayoutHTML;

    const content = template.content;

    const grid = content.querySelector('#fs-grid') as HTMLElement;

    games.forEach(game => {
        const card = document.createElement('game-card') as GameCard;

        card.dataset.id = game.id; // Guardar ID para referencia futura
        card.game = game; // Esto asigna el juego y llama a render() dentro del componente        
        grid.appendChild(card);
    });

    //ESCUCHAR EVENTOS DE LOS COMPONENTES    
    const fsImage = content.querySelector("#fs-image")
    const fsLogo = content.querySelector("#fs-logo")

    window.addEventListener("game-selected", (e) => {
        const event = e as CustomEvent;
        const gameID = event.detail

        gameSelected(gameID);

    })

    async function gameSelected(gameID: string) {
        const game = await window.electronAPI.invoke('get-game-detail', gameID) as Game;

        if (game.gameImages.hero) {
            fsImage?.classList.remove("display-none")
            fsImage?.setAttribute("src", "stellarhub://" + game.gameImages.hero);
        } else {
            fsImage?.classList.add("display-none")
        }

        if (game.gameImages.logo) {
            fsLogo?.classList.remove("display-none")
            fsLogo?.setAttribute("src", "stellarhub://" + game.gameImages.logo);
        } else {
            fsLogo?.classList.add("display-none")
        }

    }


    return content;
}

