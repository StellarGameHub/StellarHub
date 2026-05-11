import { Game } from '../../../shared/types';
import { gameSession } from '../../services/gameSessionService';
import panelHtml from '/templates/game-details-panel.html?raw';

export class GameDetailsPanel extends HTMLElement {

    //private gameIsRunning: boolean = false;
    // private runningGames: Map<string, boolean> = new Map();
    private _gameID: string | null = null;

    private boundOnGameStarted: (gameId: string) => void;
    private boundOnGameStopped: (gameId: string) => void;

    set gameID(gameID: string) {
        this._gameID = gameID;
        this.updatePanel();
    }
    get gameID(): string | null {
        return this._gameID;
    }

    constructor() {
        super();
        this.boundOnGameStarted = this.onGameStarted.bind(this);
        this.boundOnGameStopped = this.onGameStopped.bind(this);
    }

    connectedCallback() {
        this.render();
        gameSession.on('game-started', this.onGameStarted);
        gameSession.on('game-stopped', this.onGameStopped);
        this.attachEvents();
    }

    disconnectedCallback() {
        gameSession.off('game-started', this.onGameStarted);
        gameSession.off('game-stopped', this.onGameStopped);
    }

    private onGameStarted = (gameId: string) => {
        if (gameId === this.gameID) {
            //this.gameIsRunning = true;
            this.updatePlayButton();
        }
    };

    private onGameStopped = (gameId: string) => {
        if (gameId === this.gameID) {
            //this.gameIsRunning = false;
            this.updatePlayButton();
        }
    };

    private async launchGame() {
        if (!this.gameID) return;
        const result = await gameSession.launchGame(this.gameID);
        if (!result.success) alert('Error: ' + result.error);
    }

    private async stopGame() {
        if (!this.gameID) return;
        await gameSession.stopGame(this.gameID);
    }

    attachEvents() {

        // Play BUtton
        const playButton = this.querySelector("#btn-gdp-play") as HTMLButtonElement;
        //Play Button Event
        playButton?.addEventListener("click", async (e) => {
            e.stopPropagation();

            if (!this.gameID) return;
            const gameIsRunning = gameSession.isGameRunning(this.gameID);

            if (gameIsRunning) {
                await this.stopGame();
            } else {
                await this.launchGame();
            }
        });

        // Delete Button
        const deleteButton = this.querySelector("#btn-gdp-delete") as HTMLButtonElement;
        deleteButton?.addEventListener("click", async (e) => {
            e.stopPropagation();

            await window.electronAPI.invoke("delete-game-by-id", this.gameID)
            this.updatePanel();
        })

        // CONFIG MENU DROPDOWN

        const menuButton = this.querySelector("#btn-gdp-menu") as HTMLButtonElement;
        menuButton?.addEventListener("click", (e) => {
            e.stopPropagation();

            const dropdownElement = menuButton.closest('.dropdown')
            if (dropdownElement) dropdownElement.querySelector(".dropdown-content")?.classList.toggle('open');
        });
    }

    private render() {
        this.innerHTML = panelHtml;
    }

    private async updatePanel() {
        const game = await window.electronAPI.invoke('get-game-detail', this._gameID) as Game;
        const gameDetailsPanel = this.querySelector("#game-details-panel");

        if (!game) {
            gameDetailsPanel?.classList.add("hidden")
            return;
        }

        //Save GameID to use from the actions on the panel        
        this.dataset.gameid = game.id;

        const spanPlayTime = this.querySelector("#span-play-time");
        if (spanPlayTime) spanPlayTime.textContent = (Math.round(((game.playtimeMinutes / 60) + Number.EPSILON) * 100) / 100).toString();

        const spanLastPlayed = this.querySelector("#span-last-played")
        if (spanLastPlayed) {

            spanLastPlayed.textContent = this.calculateLastTimePlayed(game.lastPlayedAt)
        }


        const heroImage = this.querySelector("#gdp-hero-image") as HTMLImageElement;

        if (heroImage) this.transitionImage(heroImage, `stellarhub://${game.gameImages.hero}`);


        const logoImage = this.querySelector("#gdp-logo-image") as HTMLImageElement;
        if (logoImage) this.transitionImage(logoImage, `stellarhub://${game.gameImages.logo}`);


        const spanCategory = this.querySelector("span-category")
        if (game.categories && spanCategory) {
            spanCategory.textContent = game.categories[0];
        }

        const desktopBackground = document.querySelector("#ds-background-img") as HTMLImageElement;
        if (desktopBackground) this.transitionImage(desktopBackground, `stellarhub://${game.gameImages.hero}`, 300);



        //Hidde dropdown if it is shown

        const menuButton = this.querySelector("#btn-gdp-menu") as HTMLButtonElement;
        const dropdownElement = menuButton.closest('.dropdown')
        if (dropdownElement) dropdownElement.querySelector(".dropdown-content")?.classList.remove('open');

        this.updatePlayButton();

        gameDetailsPanel?.classList.remove("hidden")
    }

    updatePlayButton() {

        if (!this.gameID) return;

        const playButton = this.querySelector("#btn-gdp-play") as HTMLButtonElement;
        const playBttonTextSpan = playButton.querySelector("span");
        const playBttonIcon = playButton.querySelector("i");


        const gameIsRunning = gameSession.isGameRunning(this.gameID);

        if (gameIsRunning) {
            playButton.classList.replace('btn-primary', 'btn-tertiary');
            if (playBttonTextSpan) playBttonTextSpan.textContent = 'Stop';
            if (playBttonIcon) playBttonIcon.className = 'bi bi-stop-fill'
        } else {
            playButton.classList.replace('btn-tertiary', 'btn-primary');
            if (playBttonTextSpan) playBttonTextSpan.textContent = 'Play';
            if (playBttonIcon) playBttonIcon.className = 'bi bi-play-fill'
        }
    }


    private calculateLastTimePlayed(gameLastPlayedAt: Date | undefined): string {
        let lastPlayedString = "N/A";

        if (gameLastPlayedAt) {

            const now = new Date();
            const playedDate = new Date(gameLastPlayedAt);

            // Compare only dates, not hours
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const playedDay = new Date(
                playedDate.getFullYear(),
                playedDate.getMonth(),
                playedDate.getDate()
            );

            if (playedDay.getTime() === today.getTime()) {

                lastPlayedString = "Today";

            } else if (playedDay.getTime() === yesterday.getTime()) {

                lastPlayedString = "Yesterday";

            } else {

                lastPlayedString = playedDate.toLocaleDateString('es-UY', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        }

        return lastPlayedString;
    }

    private transitionImage(
        element: HTMLImageElement,
        newSrc: string,
        delay: number = 300
    ) {

        element.classList.add('fade-out');

        setTimeout(() => {

            element.src = newSrc;

            element.onload = () => {
                element.classList.remove('fade-out');
            };

        }, delay);
    }
}

if (!customElements.get('game-details-panel')) {
    customElements.define('game-details-panel', GameDetailsPanel);
}