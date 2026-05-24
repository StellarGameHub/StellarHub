import { Game } from '../../../shared/types';
import { gameSession } from '../../services/gameSessionService';
import panelHtml from '/templates/game-details-panel.html?raw';

export class GameDetailsPanel extends HTMLElement {

    //private gameIsRunning: boolean = false;
    // private runningGames: Map<string, boolean> = new Map();
    private _gameId: string | null = null;

    private boundOnGameStarted: (gameId: string) => void;
    private boundOnGameStopped: (gameId: string) => void;

    set gameId(gameId: string) {
        this._gameId = gameId;
        this.updatePanel();
    }
    get gameId(): string | null {
        return this._gameId;
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
        if (gameId === this.gameId) {
            //this.gameIsRunning = true;
            this.updatePlayButton(true);
        }
    };

    private onGameStopped = (gameId: string) => {
        if (gameId === this.gameId) {
            //this.gameIsRunning = false;
            this.updatePlayButton(true);
        }
    };

    private async launchGame() {
        if (!this.gameId) return;
        const result = await gameSession.launchGame(this.gameId);
        if (!result.success) alert('Error: ' + result.error);
    }

    private async stopGame() {
        if (!this.gameId) return;
        await gameSession.stopGame(this.gameId);
    }

    attachEvents() {

        // Play BUtton
        const playButton = this.querySelector("#btn-gdp-play") as HTMLButtonElement;
        //Play Button Event
        playButton?.addEventListener("click", async (e) => {
            e.stopPropagation();

            if (!this.gameId) return;
            const gameIsRunning = gameSession.isGameRunning(this.gameId);

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


            this.dispatchEvent(new CustomEvent('open-remove-game-modal', {
                bubbles: true,
                composed: true,
                detail: this.gameId
            }));

            console.log("Evento de Abrir Modal Remove disparado!")
            // this.updatePanel();
        })

        // Install Button
        const installButton = this.querySelector("#btn-gdp-install") as HTMLButtonElement;
        installButton?.addEventListener("click", async (e) => {
            e.stopPropagation();

            const result = await window.electronAPI.invoke("install-game-by-id", this.gameId);
            if (result.success) {
                this.updatePanel()
            }
        })

        document.addEventListener('games-updated', async () => {
            console.log("Escuchando Evento: 'games-updated'")
            await this.updatePanel();
        });

        // CONFIG MENU DROPDOWN

        //NOW IS USING HTML POPOVER, 

        // const menuButton = this.querySelector("#btn-gdp-menu") as HTMLButtonElement;
        // menuButton?.addEventListener("click", (e) => {
        //     e.stopPropagation();

        //     const dropdownElement = menuButton.closest('.dropdown')
        //     if (dropdownElement) dropdownElement.querySelector(".dropdown-content")?.classList.toggle('open');
        // });
    }

    private render() {
        this.innerHTML = panelHtml;
    }

    private async updatePanel() {
        const game = await window.electronAPI.invoke('get-game-detail', this._gameId) as Game;
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

        //Info del game:
        this.cleanDetailsPanel()

        const spanDeveloper = this.querySelector("#gdp-span-developer") as HTMLElement;
        if (spanDeveloper && game.developers) spanDeveloper.textContent = game.developers.concat().toString();

        const spanDescription = this.querySelector("#gdp-span-description") as HTMLElement;
        if (spanDescription && game.description) spanDescription.textContent = game?.description;

        const spanPublisher = this.querySelector("#gdp-span-publisher") as HTMLElement;
        if (spanPublisher && game.publishers) spanPublisher.textContent = game?.publishers?.concat().toString();

        const spanDate = this.querySelector("#gdp-span-date") as HTMLElement;
        if (spanDate && game.releaseDate) {

            const releaseDate = new Date(game.releaseDate);

            spanDate.textContent = isNaN(releaseDate.getTime())
                ? "Fecha desconocida"
                : releaseDate.toDateString();
        }

        const spanGenres = this.querySelector("#gdp-span-genres") as HTMLElement;
        if (spanGenres && game.genres) spanGenres.textContent = game?.genres.concat().toString();

        //Hidde dropdown if it is shown

        const menuButton = this.querySelector("#btn-gdp-menu") as HTMLButtonElement;
        const dropdownElement = menuButton.closest('.dropdown')
        if (dropdownElement) dropdownElement.querySelector(".dropdown-content")?.classList.remove('open');

        this.updatePlayButton(game.isInstalled);

        gameDetailsPanel?.classList.remove("hidden")
    }

    cleanDetailsPanel() {
        const spanDeveloper = this.querySelector("#gdp-span-developer") as HTMLElement;
        if (spanDeveloper) spanDeveloper.textContent = "";

        const spanDescription = this.querySelector("#gdp-span-description") as HTMLElement;
        if (spanDescription) spanDescription.textContent = "";

        const spanPublisher = this.querySelector("#gdp-span-publisher") as HTMLElement;
        if (spanPublisher) spanPublisher.textContent = "";

        const spanDate = this.querySelector("#gdp-span-date") as HTMLElement;
        if (spanDate) spanDate.textContent = "";

        const spanGenres = this.querySelector("#gdp-span-genres") as HTMLElement;
        if (spanGenres) spanGenres.textContent = "";
    }

    updatePlayButton(isInstalled: boolean) {

        if (!this.gameId) return;

        const playButton = this.querySelector("#btn-gdp-play") as HTMLButtonElement;
        const installButton = this.querySelector("#btn-gdp-install") as HTMLButtonElement;
        const playBttonTextSpan = playButton.querySelector("span");
        const playBttonIcon = playButton.querySelector("i");


        if (!isInstalled) {
            installButton.classList.remove("display-none");
            playButton.classList.add("display-none");
        } else {

            installButton.classList.add("display-none");
            playButton.classList.remove("display-none");

            const gameIsRunning = gameSession.isGameRunning(this.gameId);

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