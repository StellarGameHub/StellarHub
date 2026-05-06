import { GameSummary } from '../../shared/types';

declare global {
    interface Window {
        electronAPI: {
            invoke(channel: string, data?: any): Promise<any>;
        };
    }
}

export class GameCard extends HTMLElement {
    private gameId: string = '';
    private gameData: GameSummary | null = null;

    static get observedAttributes() {
        return ['game-id'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'game-id' && newValue !== oldValue) {
            this.gameId = newValue;
            this.loadGameData();
        }
    }

    async loadGameData() {
        try {
            this.gameData = await window.electronAPI.invoke('get-game-detail', this.gameId);
            this.render();
        } catch (error) {
            console.error('Error loading game data:', error);
            this.innerHTML = `<div class="error">Error al cargar el juego</div>`;
        }
    }

    render() {
        if (!this.gameData) {
            this.innerHTML = `<div class="loading">Cargando...</div>`;
            return;
        }

        const game = this.gameData;
        this.innerHTML = `
      <div class="game-card">
        <div class="game-card-inner">
          <img class="game-cover" src="${game.coverImage || '/assets/default-cover.png'}" alt="${game.title}">
          <div class="game-info">
            <h3 class="game-title">${game.title}</h3>
            <p class="game-developer">${game.developer || ''}</p>
            <p class="game-year">${game.releaseYear || ''}</p>
            <button class="play-button" data-id="${this.gameId}">▶️ Jugar</button>
            <button class="delete-button" data-id="${this.gameId}">❌ Eliminar</button>
          </div>
        </div>
      </div>
    `;

        // Vincular eventos al botón
        const playBtn = this.querySelector('.play-button');
        playBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.electronAPI.invoke('launch-game-by-id', this.gameId);
        });
        const deleteBtn = this.querySelector('.delete-button');
        deleteBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();

            const result = await window.electronAPI.invoke('delete-game-by-id', this.gameId);
            if (result.success) {
                window.dispatchEvent(new CustomEvent('games-updated'));
            } else {
                alert('Error: ' + result.error);
            }            

        });
    }
}

customElements.define('game-card', GameCard);