import desktopMenuHTML from '../../templates/desktop-menu.html?raw';

export class DesktopMenu extends HTMLElement {
    connectedCallback() {
        // const shadow = this.attachShadow({ mode: 'open' });
        // shadow.innerHTML = desktopMenuHTML;

        console.log("Connected DesktopMenu to DOM")
        this.render();


        const logo = this.querySelector("#ds-navbar-logo");
        const menu = this.querySelector("#ds-lateral-menu");
        logo?.addEventListener("click", () => {
            menu?.classList.toggle("open");
        })

        ///EVENTS 

        this.attachEvents();


    }
    render() {
        this.innerHTML = desktopMenuHTML;
    }

    attachEvents() {
        this.querySelector('#btn-add-category-modal')?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('open-add-category-modal',
                {
                    bubbles: true,
                    composed: true
                }
            ));
        });

        this.querySelector("#btn-add-game-modal")?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('open-add-game-modal',
                {
                    bubbles: true,
                    composed: true
                }
            ));
        });

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
    }
}

if (!customElements.get('desktop-menu')) {
    customElements.define('desktop-menu', DesktopMenu);
}
