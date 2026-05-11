import { GameSummary } from '../../../shared/types';
import gameCardHtml from '../../templates/game-card.html?raw';
import { gameSession } from '../../services/gameSessionService';

export class GameCard extends HTMLElement {

    private gameId: string = '';
    private gameData: GameSummary | null = null;
    //private gameIsRunning: boolean = false;
    private boundOnGameStarted: (gameId: string) => void;
    private boundOnGameStopped: (gameId: string) => void;

    constructor() {
        super();
        this.boundOnGameStarted = this.onGameStarted.bind(this);
        this.boundOnGameStopped = this.onGameStopped.bind(this);
    }

    connectedCallback() {
        gameSession.on('game-started', this.boundOnGameStarted);
        gameSession.on('game-stopped', this.boundOnGameStopped);
    }

    disconnectedCallback() {
        gameSession.off('game-started', this.boundOnGameStarted);
        gameSession.off('game-stopped', this.boundOnGameStopped);
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

    private async launchGame() {
        const result = await gameSession.launchGame(this.gameId);
        if (!result.success) {
            alert('Error: ' + result.error);
        }
    }

    private async stopGame() {
        await gameSession.stopGame(this.gameId);
    }

    set game(value: GameSummary) {
        this.gameId = value.id;
        this.gameData = value;
        this.render();
    }

    render() {
        if (!this.gameData) {
            this.innerHTML = `<div class="loading">Cargando...</div>`;
            return;
        }

        this.innerHTML = gameCardHtml;
        this.classList.add('game-card'); // Agregar clase para estilos 

        const game = this.gameData;

        this.setAttribute("data-game-id", game.id);

        //Llenar datos del juego en el template
        //Game Title
        this.setAttribute("data-game-title", game.title);
        this.querySelector('.game-title')!.textContent = game.title;
        //Game Cover
        const img = this.querySelector('.game-cover') as HTMLImageElement;
        //Poner imagen Grid o mostrar default
        img.src = game.gameImages.grid ? `stellarhub://${game.gameImages.grid}` : '/assets/default-cover.png';
        img.alt = game.title;
        //Game Developer
        if (game.developer) {
            this.querySelector('.game-developer')!.textContent = game.developer
        }
        //Game Year
        if (game.releaseYear) {
            this.querySelector('.game-year')!.textContent = game.releaseYear.toString();
        }

        // Vincular eventos al botón
        const playBtn = this.querySelector('.play-button'); // Seleccionar el botón de jugar
        playBtn?.setAttribute('data-game-id', game.id); // Guardar el ID del juego en el dataset del botón
        playBtn?.addEventListener('click', (e) => { // Agregar listener al botón de jugar

            const gameIsRunning = gameSession.isGameRunning(this.gameId);

            if (gameIsRunning) {
                this.stopGame()
            } else {
                this.launchGame();
            }
        });

        this.addEventListener('click', async (e) => {
            e.stopPropagation();

            this.dispatchEvent(new CustomEvent('game-card-selected',
                {
                    bubbles: true,
                    composed: true,
                    detail: {
                        gameID: game.id,
                        gameCard: this
                    }

                }
            ));

        });

    }

    updatePlayButton() {
        const playButton = this.querySelector(".play-button") as HTMLButtonElement;
        const playBttonTextSpan = playButton.querySelector("span");
        const playBttonIcon = playButton.querySelector("i");

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

customElements.define('game-card', GameCard);