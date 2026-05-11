import desktopLayoutHTML from './desktop-layout.html?raw';

import { Game, GameSummary } from '../../shared/types';
import { GameCard } from '../components/shared/GameCard';
import { AddCategoryModal } from '../components/desktop/modals/AddCategoryModal';

import '../components/desktop/modals/AddCategoryModal';
import '../components/desktop/modals/ScanManagerModal';
import '../components/desktop/modals/AddGameModal';
import '../components/desktop/modals/AppSettingsModal';
import '../components/desktop/GameDetailsPanel';
import '../components/desktop/DesktopMenu';
import '../components/shared/GameCard'

import '../utils/uiHelpers'

import { AddGameModal } from '../components/desktop/modals/AddGameModal';
import { ScanManagerModal } from '../components/desktop/modals/ScanManagerModal';

//clases css
import '../styles/components/desktop-menu.css'
import '../styles/components/game-details-panel.css'
import { AppSettingsModal } from '../components/desktop/modals/AppSettingsModal';
import { GameDetailsPanel } from '../components/desktop/GameDetailsPanel';


export function renderDesktopLayout(games: GameSummary[]): DocumentFragment {


    //To save the cards
    const gameCards: HTMLElement[] = [];

    const template = document.createElement('template');
    template.innerHTML = desktopLayoutHTML;

    const content = template.content;

    console.log("Contenido del DesktopLaytour", content)

    const grid = content.querySelector('#ds-grid') as HTMLElement;

    games.forEach(game => {

        const card = document.createElement('game-card') as GameCard;

        card.game = game;

        grid.appendChild(card);
        gameCards.push(card);
    });


    //ESCUCHAR EVENTOS DE LOS COMPONENTES
    const menu = content.querySelector('desktop-menu');
    if (menu) {

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

        const scanManagerModal = content.querySelector('modal-scan-manager') as ScanManagerModal
        menu.addEventListener('open-scan-manager-modal', () => {
            scanManagerModal.open();
        });

        const appSettingsModal = content.querySelector('modal-app-settings') as AppSettingsModal
        menu.addEventListener('open-app-settings-modal', () => {
            appSettingsModal.open();
        });

        const gameDetailsPanel = content.querySelector("game-details-panel") as GameDetailsPanel
        window.addEventListener('game-card-selected', (e) => {

            const event = e as CustomEvent;
            gameDetailsPanel.gameID = event.detail.gameID;

            for (let gameCard of gameCards) {
                gameCard.classList.remove("selected");
            }

            (event.detail.gameCard as HTMLElement)?.classList.add("selected")

        });
    }

    return content;

}