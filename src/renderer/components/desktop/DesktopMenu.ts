import desktopMenuHTML from '../../templates/desktop-menu.html?raw';

export class DesktopMenu extends HTMLElement {
    connectedCallback() {
        this.render();
        this.attachEvents(); ///EVENTS 
    }

    render() {
        this.innerHTML = desktopMenuHTML;
    }

    attachEvents() {

        //Button to open Main Menu
        const brand = this.querySelector("#ds-navbar-brand");
        const globalmenu = this.querySelector("#ds-menu")
        // const menu = this.querySelector("#ds-lateral-menu");

        brand?.addEventListener("click", () => {
            globalmenu?.classList.toggle("open");
        })

        // Button to open Categories Modal
        this.querySelector('#btn-add-category-modal')?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('open-add-category-modal',
                {
                    bubbles: true,
                    composed: true
                }
            ));
        });
        // Button to open Add Game Modal
        this.querySelector("#btn-add-game-modal")?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('open-add-game-modal',
                {
                    bubbles: true,
                    composed: true
                }
            ));
        });
        // Button to open Scan Manager Modal
        this.querySelector("#btn-scan-manager-modal")?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('open-scan-manager-modal',
                {
                    bubbles: true,
                    composed: true
                }
            ));
        });
        //Button to open App Settings Modal
        this.querySelector("#btn-app-settings-modal")?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('open-app-settings-modal',
                {
                    bubbles: true,
                    composed: true
                }
            ));
        });
        // Button to change to Fullscreen
        this.querySelector('#btn-toggle-fullscreen')?.addEventListener('click', () => {
            console.log("Dispatching event ToogleFullscreen");
            this.dispatchEvent(new CustomEvent(
                'toggle-fullscreen',
                {
                    bubbles: true,
                    composed: true
                }
            ));
        });
        //Button to quit app
        document.getElementById('close-app-btn')?.addEventListener('click', () => {
            window.electronAPI.quitApp();
        });

        //SEARCH BAR
        let searchTimer: ReturnType<typeof setTimeout>;

        this.querySelector('#ds-search-bar')?.addEventListener('input', async (e) => {
            // 1. Clear any existing timer to reset the delay
            clearTimeout(searchTimer);

            // 2. Set a new timer to trigger the search after 500ms
            searchTimer = setTimeout(() => {
                const input = e.target as HTMLInputElement
                if (input) {
                    const searchQuery = input.value.trim().toUpperCase();
                    const games = document.querySelectorAll("game-card")

                    for (const game of games) {
                        if (!game.getAttribute("data-game-title")?.toUpperCase().includes(searchQuery)) {
                            game.classList.add("display-none");
                        } else {
                            game.classList.remove("display-none");
                        }
                    }
                }
            }, 500);
        }
        )

    }

    private async searchEvent() {

    }
}

if (!customElements.get('desktop-menu')) {
    customElements.define('desktop-menu', DesktopMenu);
}
