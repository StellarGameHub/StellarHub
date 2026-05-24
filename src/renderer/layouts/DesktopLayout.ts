import desktopLayoutHTML from './desktop-layout.html?raw';

import { GameSummary } from '../../shared/types';
import { GameCard } from '../components/shared/GameCard';
import { AddCategoryModal } from '../components/desktop/modals/AddCategoryModal';

import '../components/desktop/modals/AddCategoryModal';
import '../components/desktop/modals/ScanManagerModal';
import '../components/desktop/modals/AddGameModal';
import '../components/desktop/modals/RemoveGameModal';
import '../components/desktop/modals/AppSettingsModal';
import '../components/desktop/GameDetailsPanel';
import '../components/desktop/DesktopMenu';
import '../components/desktop/TaskToast';
import '../components/shared/GameCard';

import '../utils/uiHelpers';

import { AddGameModal } from '../components/desktop/modals/AddGameModal';
import { ScanManagerModal } from '../components/desktop/modals/ScanManagerModal';
import { AppSettingsModal } from '../components/desktop/modals/AppSettingsModal';
import { GameDetailsPanel } from '../components/desktop/GameDetailsPanel';

import { DesktopViewType, GameCardStyle } from '../../shared/enums';

// Clases CSS
import '../styles/components/desktop-menu.css';
import '../styles/components/game-details-panel.css';
import { RemoveGameModal } from '../components/desktop/modals/RemoveGameModal';

// Estado global
const gameCards: GameCard[] = [];
const activeFilters: string[] = [];


let currentSelectedId: string | undefined = undefined;
let currentSelectedView: DesktopViewType | undefined = undefined;
let desktopLayout: DocumentFragment | undefined = undefined;

export async function renderDesktopLayout(
    games: GameSummary[]
): Promise<DocumentFragment> {

    const template = document.createElement('template');
    template.innerHTML = desktopLayoutHTML;

    desktopLayout = template.content;

    const grid = desktopLayout.querySelector('#ds-grid') as HTMLElement;

    // Limpiar referencias viejas
    gameCards.length = 0;

    games.forEach(game => {

        const card = document.createElement('game-card') as GameCard;

        card.setStyle(GameCardStyle.PORTRAIT);
        card.setGame(game);

        grid.appendChild(card);

        gameCards.push(card);
    });

    await updateGames();

    // ESCUCHAR EVENTOS DE LOS COMPONENTES

    const mainContainer = desktopLayout.querySelector('.main-container');

    if (mainContainer) {

        // =========================
        // MODALES
        // =========================

        const addCategoryModal =
            desktopLayout.querySelector('modal-add-category') as AddCategoryModal;

        mainContainer.addEventListener('open-add-category-modal', () => {
            addCategoryModal.open();
        });

        const addGameModal =
            desktopLayout.querySelector('modal-add-game') as AddGameModal;

        mainContainer.addEventListener('open-add-game-modal', () => {
            addGameModal.open();
        });
        const removeGameModal =
            desktopLayout.querySelector('modal-remove-game') as RemoveGameModal;

        mainContainer.addEventListener('open-remove-game-modal', (e) => {
            console.log("Escuchando evento: 'open-remove-game-modal'")
            const gameId = (e as CustomEvent)?.detail
            removeGameModal.open(gameId);
        });

        const scanManagerModal =
            desktopLayout.querySelector('modal-scan-manager') as ScanManagerModal;

        mainContainer.addEventListener('open-scan-manager-modal', () => {
            scanManagerModal.open();
        });

        const appSettingsModal =
            desktopLayout.querySelector('modal-app-settings') as AppSettingsModal;

        mainContainer.addEventListener('open-app-settings-modal', () => {
            appSettingsModal.open();
        });

        // =========================
        // GAME DETAILS
        // =========================

        const gameDetailsPanel =
            desktopLayout.querySelector('game-details-panel') as GameDetailsPanel;

        mainContainer.addEventListener('game-card-selected', (e) => {

            const event = e as CustomEvent;

            currentSelectedId = event.detail.gameID;

            gameDetailsPanel.gameId = event.detail.gameID;

            // Limpiar selección previa
            gameCards.forEach(gc => {
                gc.classList.remove('selected');
            });

            // Marcar seleccionada
            (event.detail.gameCard as HTMLElement)
                ?.classList.add('selected');
        });

        // =========================
        // CAMBIO DE VIEW
        // =========================

        mainContainer.addEventListener('toggle-view', (e) => {

            const event = e as CustomEvent;

            const type: DesktopViewType = event.detail;

            currentSelectedView = type;

            changeViewType(type);
        });

        // =========================
        // FILTROS
        // =========================

        mainContainer.addEventListener('filter-games', (e) => {

            const event = e as CustomEvent;

            activeFilters.length = 0;

            const checkBoxes = event.detail as HTMLInputElement[];
            checkBoxes.forEach(cb => {

                if (cb.checked) {

                    const filter = cb.value;
                    if (filter) {
                        activeFilters.push(filter);
                    }
                }
            });

            filterGames();
        });

        // =========================
        // ACTUALIZAR JUEGOS
        // =========================

        mainContainer.addEventListener('games-updated', async () => {
            console.log("Escuchando Evento: 'games-updated'")
            await updateGames();
            filterGames();
        });

        window.electronAPI.onGamesUpdated(async () => {
            await updateGames();
            filterGames();
        });
        window.electronAPI.onGameImagesUpdated(async () => {
            await updateGameImages();
        });
    }

    return desktopLayout;
}

function filterGames() {

    for (const gameCard of gameCards) {

        let gameFilters = gameCard.getFilters();

        let visible = true;
        gameFilters.forEach(gf => {

            if (!activeFilters.includes(gf)) {
                visible = false;
            }
        })

        if (
            visible
        ) {
            gameCard.show();
        } else {
            gameCard.hide();
        }
    }
}

function changeViewType(type: DesktopViewType) {

    switch (type) {

        case DesktopViewType.WIDE:

            localStorage.setItem('desktop-view-type', 'wide');

            for (const card of gameCards) {
                card.setStyle(GameCardStyle.WIDE);
            }

            break;

        case DesktopViewType.GRID:

            localStorage.setItem('desktop-view-type', 'grid');

            for (const card of gameCards) {
                card.setStyle(GameCardStyle.PORTRAIT);
            }

            break;

        case DesktopViewType.LIST:

            localStorage.setItem('desktop-view-type', 'list');

            for (const card of gameCards) {
                card.setStyle(GameCardStyle.LIST);
            }

            break;
    }
}

async function updateGames() {

    const grid = document.querySelector('#ds-grid') as HTMLElement;

    if (!grid) return;

    // Limpiar DOM
    grid.innerHTML = '';

    // Limpiar referencias
    gameCards.length = 0;

    const games =
        await window.electronAPI.invoke('get-games-summary') as GameSummary[];

    let cardStyle = GameCardStyle.PORTRAIT;

    switch (localStorage.getItem('desktop-view-type')) {

        case 'wide':
            cardStyle = GameCardStyle.WIDE;
            break;

        case 'list':
            cardStyle = GameCardStyle.LIST;
            break;
    }

    games.forEach(game => {

        const card = document.createElement('game-card') as GameCard;

        card.setStyle(cardStyle);

        card.setGame(game);

        grid.appendChild(card);

        gameCards.push(card);
    });

    // Restaurar selección
    if (currentSelectedId) {

        const selectedGameCard =
            desktopLayout?.querySelector(
                `game-card[data-game-id="${currentSelectedId}"]`
            ) as HTMLElement;

        if (selectedGameCard) {
            selectedGameCard.click();
        }
    }
}

async function updateGameImages() {
    const gameData =
        await window.electronAPI.invoke('get-games-summary') as GameSummary[];

    gameCards.forEach(gc => {
        const gcData = gameData.find(x => x.id == gc.dataset.gameId);
        const gameCover = gc.querySelector(".game-cover") as HTMLImageElement;

        switch (localStorage.getItem('desktop-view-type')) {

            case 'wide':
                if (gameCover && gcData?.gameImages.wideGrid) gameCover.src = gcData?.gameImages.wideGrid;
                break;

            case 'list':
                if (gameCover && gcData?.gameImages.icon) gameCover.src = gcData?.gameImages.icon;
                break;
            case 'grid':
                if (gameCover && gcData?.gameImages.grid) gameCover.src = gcData?.gameImages.grid;

                break;
        }
    });
}