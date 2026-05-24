import { Game, GameCategory, GameSummary } from '../../shared/types';
import { GameCard } from '../components/shared/GameCard';
import fullscreenLayoutHTML from './fullscreen-layout.html?raw';
import { GameCardStyle } from '../../shared/enums';
import { CategoryBadge } from '../components/fullscreen/CategoryBadge';

import '../components/fullscreen/CategoryBadge'


export async function renderFullscreenLayout(games: GameSummary[]): Promise<DocumentFragment> {
    const template = document.createElement('template');
    template.innerHTML = fullscreenLayoutHTML;

    const content = template.content;

    const grid = content.querySelector('#fs-grid') as HTMLElement;

    games.filter(g => g.isInstalled).forEach(game => {
        const card = document.createElement('game-card') as GameCard;

        card.dataset.id = game.id; // Guardar ID para referencia futura
        card.setStyle(GameCardStyle.PORTRAIT);
        card.setGame(game); // Esto asigna el juego y llama a render() dentro del componente        
        grid.appendChild(card);
    });

    ////Llenar los GameCategory Badges

    ////Agregar DefaultBadges


    // const categoriesFetch = await window.electronAPI.invoke('get-game-categories');
    // if (categoriesFetch.success) {

    //     const Categories = categoriesFetch.categories as GameCategory[];
    //     const categoriesContainer = content.querySelector("#fs-categories");

    //     for (const category of Categories) {
    //         const categoryBadge = document.createElement('category-badge') as CategoryBadge;


    //         categoryBadge.setGameCategory(category);
    //         categoriesContainer?.appendChild(categoryBadge);
    //     }
    // }


    //ESCUCHAR EVENTOS DE LOS COMPONENTES    
    const fsImage = content.querySelector("#fs-image")
    const fsLogo = content.querySelector("#fs-logo")
    const fsBackgroundImage = content.querySelector("#fs-bg-image")

    window.addEventListener("game-selected", (e) => {
        const event = e as CustomEvent;
        const gameID = event.detail

        gameSelected(gameID);

    })

    async function gameSelected(gameID: string) {
        const game = await window.electronAPI.invoke('get-game-detail', gameID) as Game;


        if (game.gameImages?.hero) {
            fsImage?.setAttribute("src", "stellarhub://" + game.gameImages.hero);
            fsBackgroundImage?.setAttribute("src", "stellarhub://" + game.gameImages.hero);
        } else {
            fsImage?.setAttribute("src", "");
            fsBackgroundImage?.setAttribute("src", "");
        }
        if (game.gameImages?.logo) {
            fsLogo?.setAttribute("src", "stellarhub://" + game.gameImages?.logo);
        } else {
            fsLogo?.setAttribute("src", "");
        }

    }


    return content;
}

