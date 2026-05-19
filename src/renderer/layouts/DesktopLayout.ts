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
import '../components/desktop/TaskToast'
import '../components/shared/GameCard'

import '../utils/uiHelpers'

import { AddGameModal } from '../components/desktop/modals/AddGameModal';
import { ScanManagerModal } from '../components/desktop/modals/ScanManagerModal';

//clases css
import '../styles/components/desktop-menu.css'
import '../styles/components/game-details-panel.css'
import { AppSettingsModal } from '../components/desktop/modals/AppSettingsModal';
import { GameDetailsPanel } from '../components/desktop/GameDetailsPanel';
import { DesktopViewType, GameCardStyle } from '../../shared/enums';

//To save the cards
const gameCards: GameCard[] = [];
let currentSelectedId: string | undefined = undefined;
let currentSelectedView: DesktopViewType | undefined = undefined;
let desktopLayout: DocumentFragment | undefined = undefined;

export async function renderDesktopLayout(games: GameSummary[]): Promise<DocumentFragment> {


    //To save the cards
    const gameCards: GameCard[] = [];

    const template = document.createElement('template');
    template.innerHTML = desktopLayoutHTML;

    desktopLayout = template.content;

    const grid = desktopLayout.querySelector('#ds-grid') as HTMLElement;

    games.forEach(game => {

        const card = document.createElement('game-card') as GameCard;
        card.setStyle(GameCardStyle.PORTRAIT)
        card.setGame(game); // Esto llama a RENDER        

        grid.appendChild(card);
        gameCards.push(card);
    });
    await updateGames();

    //PRUEBA DE CAMBIAR LOS ESTILOS EN TIEMPO DE EJECUCION:
    
    // const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
    //     for (const gameCard of gameCards) {
    //         gameCard.setStyle(GameCardStyle.WIDE);
    //     }
    // }, 5000);

    //ESCUCHAR EVENTOS DE LOS COMPONENTES
    const menu = desktopLayout.querySelector('desktop-menu');
    if (menu) {

        // MODALs

        const addCategoryModal = desktopLayout.querySelector('modal-add-category') as AddCategoryModal;

        menu.addEventListener('open-add-category-modal', () => {
            addCategoryModal.open();
        });

        const addGameModal = desktopLayout.querySelector('modal-add-game') as AddGameModal;

        menu.addEventListener('open-add-game-modal', () => {
            addGameModal.open();
        });

        const scanManagerModal = desktopLayout.querySelector('modal-scan-manager') as ScanManagerModal
        menu.addEventListener('open-scan-manager-modal', () => {
            scanManagerModal.open();
        });

        const appSettingsModal = desktopLayout.querySelector('modal-app-settings') as AppSettingsModal
        menu.addEventListener('open-app-settings-modal', () => {
            appSettingsModal.open();
        });

        const gameDetailsPanel = desktopLayout.querySelector("game-details-panel") as GameDetailsPanel
        window.addEventListener('game-card-selected', (e) => {

            const event = e as CustomEvent;
            currentSelectedId = event.detail.gameID;
            gameDetailsPanel.gameId = event.detail.gameID;

            for (let gameCard of gameCards) {
                gameCard.classList.remove("selected");
            }

            (event.detail.gameCard as HTMLElement)?.classList.add("selected")

        });

        ///CAMBBIAR EL LAYOUT DEL MENU
        ///DEBERIAMOS RECORDAR LA OPCION ELEGIDA POR EL USUARIO
        menu.addEventListener('toggle-view', (e) => {
            const event = e as CustomEvent;
            let type: DesktopViewType = event.detail;
            currentSelectedView = type;
            changeViewType(type);
        })

        ///CAMBIO DE FILTROS
        menu.addEventListener('filter-games', async (e) => {
            const event = e as CustomEvent;
            await filterGames(event.detail);
        })


        // Escuchar evento de actualización de juegos para re-renderizar
        menu.addEventListener('games-updated', async () => {
            await updateGames();
        });
    }

    return desktopLayout;
}

function filterGames(checkBoxes: HTMLInputElement[]) {
    let activeFilters: string[] = [];

    checkBoxes.forEach(cb => {
        if (cb.checked) {
            let filter = cb.value;
            if (filter) activeFilters.push(filter);
        }
    });
    for (const gameCard of gameCards) {
        if (gameCard.getFilters().some(filter => activeFilters.includes(filter))) {
            gameCard.show();
        } else {
            gameCard.hide();
        }
    }
}

function changeViewType(type: DesktopViewType) {
    switch (type) {
        case DesktopViewType.WIDE:
            localStorage.setItem("desktop-view-type", "wide");
            for (const card of gameCards) {
                card.setStyle(GameCardStyle.WIDE);
            }
            break;
        case DesktopViewType.GRID:
            localStorage.setItem("desktop-view-type", "grid");
            for (const card of gameCards) {
                card.setStyle(GameCardStyle.PORTRAIT);
            }
            break;
        case DesktopViewType.LIST:
            localStorage.setItem("desktop-view-type", "list");
            for (const card of gameCards) {
                card.setStyle(GameCardStyle.LIST);
            }
            break;
    }
}

async function updateGames() {
    const grid = desktopLayout?.querySelector('#ds-grid') as HTMLElement;

    grid.innerHTML = "";

    const games = await window.electronAPI.invoke('get-games-summary') as GameSummary[];
    let cardStyle = GameCardStyle.PORTRAIT;

    switch (localStorage.getItem("desktop-view-type")) {
        case "wide":
            cardStyle = GameCardStyle.WIDE;
            break;
        case "list":
            cardStyle = GameCardStyle.LIST;
            break;
    }

    games.forEach(game => {

        const card = document.createElement('game-card') as GameCard;

        card.setStyle(cardStyle)
        card.setGame(game);

        grid.appendChild(card);
        gameCards.push(card);
    });

    if (currentSelectedId) {
        let selectedGameCard = desktopLayout?.querySelector(`game-card[data-game-id="${currentSelectedId}"]`) as HTMLElement;
        if (selectedGameCard) selectedGameCard.click();
    }
}

