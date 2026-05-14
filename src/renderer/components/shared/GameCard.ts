import { GameSummary } from '../../../shared/types';
import gameCardHtml from '../../templates/game-card.html?raw';
import { gameSession } from '../../services/gameSessionService';
import { GameCardStyle } from '../../../shared/enums';

export class GameCard extends HTMLElement {

    private gameId: string = '';
    private gameData: GameSummary | null = null;
    private gameCardStyle: GameCardStyle = GameCardStyle.PORTRAIT;

    private boundOnGameStarted: (gameId: string) => void;
    private boundOnGameStopped: (gameId: string) => void;

    constructor() {
        super();

        this.boundOnGameStarted =
            this.onGameStarted.bind(this);

        this.boundOnGameStopped =
            this.onGameStopped.bind(this);
    }

    connectedCallback() {

        // Evitar render doble
        if (!this.dataset.initialized) {

            this.dataset.initialized = 'true';

            this.innerHTML = gameCardHtml;

            this.classList.add('game-card');

            this.setupEvents();
        }

        gameSession.on(
            'game-started',
            this.boundOnGameStarted
        );

        gameSession.on(
            'game-stopped',
            this.boundOnGameStopped
        );

        this.render();
    }

    disconnectedCallback() {

        gameSession.off('game-started', this.boundOnGameStarted);
        gameSession.off('game-stopped', this.boundOnGameStopped);
    }

    // =========================
    // Public API
    // =========================

    setGame(game: GameSummary) {

        this.gameId = game.id;
        this.gameData = game;

        this.render();
    }

    setStyle(style: GameCardStyle) {

        this.gameCardStyle = style;

        this.classList.remove(
            'gc-portrait',
            'gc-wide',
            'gc-list'
        );

        switch (style) {

            case GameCardStyle.PORTRAIT:
                this.classList.add('gc-portrait');
                break;

            case GameCardStyle.WIDE:
                this.classList.add('gc-wide');
                break;

            case GameCardStyle.LIST:
                this.classList.add('gc-list');
                break;
        }

        this.updateCover();
    }

    // =========================
    // Events
    // =========================

    private setupEvents() {

        // Evitar registrar dos veces
        if (this.dataset.eventsBound === 'true') {
            return;
        }

        this.dataset.eventsBound = 'true';

        const playBtn = this.querySelector('.play-button');

        playBtn?.addEventListener('click', (e) => {

            e.stopPropagation();

            const running =
                gameSession.isGameRunning(this.gameId);

            if (running) {
                this.stopGame();
            } else {
                this.launchGame();
            }
        });

        this.addEventListener('click', (e) => {

            e.stopPropagation();

            this.dispatchEvent(
                new CustomEvent('game-card-selected', {
                    bubbles: true,
                    composed: true,
                    detail: {
                        gameID: this.gameId,
                        gameCard: this
                    }
                })
            );
        });
    }

    private onGameStarted(gameId: string) {

        if (gameId === this.gameId) {
            this.updatePlayButton();
        }
    }

    private onGameStopped(gameId: string) {

        if (gameId === this.gameId) {
            this.updatePlayButton();
        }
    }

    // =========================
    // Game actions
    // =========================

    private async launchGame() {

        const result =
            await gameSession.launchGame(this.gameId);

        if (!result.success) {
            alert('Error: ' + result.error);
        }
    }

    private async stopGame() {

        await gameSession.stopGame(this.gameId);
    }

    // =========================
    // Rendering
    // =========================

    render() {

        if (!this.gameData) return;


        const game = this.gameData;

        this.setAttribute('data-game-id', game.id);
        this.setAttribute('data-game-title', game.title);

        // Title
        const title =
            this.querySelector('.game-title');

        if (title) {
            title.textContent = game.title;
        }

        // Developer
        const developer =
            this.querySelector('.game-developer');

        if (developer) {
            developer.textContent =
                game.developer ?? '';
        }

        // Year
        const year =
            this.querySelector('.game-year');

        if (year) {
            year.textContent =
                game.releaseYear?.toString() ?? '';
        }

        this.updateCover();
        this.updatePlayButton();
    }

    private updateCover() {

        if (!this.gameData) {
            return;
        }

        const img =
            this.querySelector('.game-cover') as HTMLImageElement;
        if (!img) {
            return;
        }

        const game = this.gameData;

        img.alt = game.title;

        switch (this.gameCardStyle) {

            case GameCardStyle.PORTRAIT:

                img.src = game.gameImages.grid
                    ? `stellarhub://${game.gameImages.grid}`
                    : '/assets/default-cover.png';

                break;

            case GameCardStyle.WIDE:

                img.src = game.gameImages.wideGrid
                    ? `stellarhub://${game.gameImages.wideGrid}`
                    : '/assets/default-cover.png';

                break;

            case GameCardStyle.LIST:

                img.src = game.gameImages.icon
                    ? `stellarhub://${game.gameImages.icon}`
                    : '/assets/default-cover.png';

                break;
        }
    }

    updatePlayButton() {

        const playButton = this.querySelector('.play-button') as HTMLButtonElement;

        if (!playButton) return;


        const textSpan =
            playButton.querySelector('span');

        const icon =
            playButton.querySelector('i');

        const running =
            gameSession.isGameRunning(this.gameId);

        if (running) {

            playButton.classList.replace(
                'btn-primary',
                'btn-tertiary'
            );

            if (textSpan) {
                textSpan.textContent = 'Stop';
            }

            if (icon) {
                icon.className = 'bi bi-stop-fill';
            }

        } else {

            playButton.classList.replace(
                'btn-tertiary',
                'btn-primary'
            );

            if (textSpan) {
                textSpan.textContent = 'Play';
            }

            if (icon) {
                icon.className = 'bi bi-play-fill';
            }
        }
    }
}

customElements.define('game-card', GameCard);