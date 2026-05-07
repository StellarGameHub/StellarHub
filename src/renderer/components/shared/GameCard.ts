import { GameSummary } from '../../../shared/types';
import gameCardHtml from '../../templates/game-card.html?raw';

declare global {
    interface Window {
        electronAPI: {
            invoke(channel: string, data?: any): Promise<any>;
        };
    }
}

export class GameCard extends HTMLElement {
    private gameData: GameSummary | null = null;

    set game(value: GameSummary) {
        console.log('Setting game data for card:', value.title);
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
        //Llenar datos del juego en el template
        //Game Title
        this.querySelector('.game-title')!.textContent = game.title;
        //Game Cover
        const img = this.querySelector('.game-cover') as HTMLImageElement;
        //Poner imagen Grid o mostrar default
        img.src = game.gameImages.grid ? `estelarhub://${game.gameImages.grid}` : '/assets/default-cover.png';
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
            e.stopPropagation();
            window.electronAPI.invoke('launch-game-by-id', game.id);
        });

        const deleteBtn = this.querySelector('.delete-button'); // Seleccionar el botón de eliminar        
        deleteBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();

            const result = await window.electronAPI.invoke('delete-game-by-id', game.id);
            if (result.success) {
                window.dispatchEvent(new CustomEvent('games-updated'));
            } else {
                alert('Error: ' + result.error);
            }

        });
    }
}

customElements.define('game-card', GameCard);