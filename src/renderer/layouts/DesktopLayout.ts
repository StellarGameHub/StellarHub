import { GameSummary } from '../../shared/types';
import { GameCard } from '../components/shared/GameCard';
import { AddCategoryModal } from '../components/desktop/AddCategoryModal';
import desktopLayoutHTML from './desktop-layout.html?raw';

import '../components/desktop/AddCategoryModal';
import '../components/desktop/AddGameModal';
import '../components/desktop/DesktopMenu';

//clases css
import '../styles/components/desktop-menu.css'
import { AddGameModal } from '../components/desktop/AddGameModal';

export function renderDesktopLayout(games: GameSummary[]): DocumentFragment {

    const template = document.createElement('template');

    template.innerHTML = desktopLayoutHTML;

    const content = template.content;

    console.log("Contenido del DesktopLaytour", content)

    const grid = content.querySelector('#ds-grid') as HTMLElement;

    games.forEach(game => {

        const card = document.createElement('game-card') as GameCard;

        card.game = game;

        grid.appendChild(card);

    });


    //ESCUCHAR EVENTOS DE LOS COMPONENTES
    const menu = content.querySelector('desktop-menu');
    if (menu) {

        // FULLSCREEN

        menu.addEventListener('toggle-fullscreen', () => {
            console.log("Esuchando a ToggleFullscreen");

            import('../services/uiMode').then(({ toggleFullscreenUI }) => {
                toggleFullscreenUI();
            });

        });

        // MODALs

        const addCategoryModal = content.querySelector('modal-add-category') as AddCategoryModal;

        menu.addEventListener('open-add-category-modal', () => {
            console.log("Esuchando a OpenAddCategoryModal");
            addCategoryModal.open();
        });

        const addGameModal = content.querySelector('modal-add-game') as AddGameModal;

        menu.addEventListener('open-add-game-modal', () => {
            addGameModal.open();
        });

    }

    return content;

}