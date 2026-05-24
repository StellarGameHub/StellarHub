import { AppSettings } from '../../../../shared/types';
import { withButtonLoading } from '../../../utils/uiHelpers';
import modalHtml from '/templates/modals/modal-remove-game.html?raw';


export class RemoveGameModal extends HTMLElement {

    private dialog!: HTMLDialogElement;

    private gameId: string | null = null;

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    private render() {
        this.innerHTML = modalHtml;
        this.dialog = this.querySelector('dialog')!;
    }

    private async attachEvents() {

        // FORM SUBMIT EVENT
        const form = this.dialog.querySelector('#remove-game-form') as HTMLFormElement;
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            console.log("RemoveGameModal Form submited")
            const submitButton = this.dialog.querySelector("button[type=submit]") as HTMLButtonElement

            if (submitButton) {

                await withButtonLoading(submitButton, (async () => {

                    if (this.gameId) {

                        console.log("Remove Game, gameId:", this.gameId);

                        const blackListGame = (this.querySelector("#input-block-game") as HTMLInputElement)?.checked

                        const removeResult = await window.electronAPI.invoke('delete-game-by-id', {
                            gameId: this.gameId,
                            blackList: blackListGame
                        });

                        if (removeResult.success) {
                            console.log("Remove Result: Success")
                            this.dispatchEvent(new CustomEvent('games-updated', {
                                bubbles: true,
                                composed: true
                            }));
                            this.dialog.close();
                            form.reset();
                        } else {
                            alert('Error: ' + removeResult.error);
                        }
                    }

                })());

            }

        });

        // CLOSE MODAL BUTON
        const closeBtn = this.querySelector('#close-modal');

        closeBtn?.addEventListener('click', () => {
            this.close();
        });
    }

    async open(gameId: string) {

        this.gameId = gameId;

        this.dialog.showModal();
        this.showLoading(false);
    }

    close() {
        this.dialog.close();
        const form = this.dialog.querySelector('#manual-game-form') as HTMLFormElement;
        form?.reset();
    }

    private showLoading(isLoading: boolean) {
        const loadingDiv = this.dialog.querySelector('#modal-loading') as HTMLElement;
        const formContainer = this.dialog.querySelector('#modal-form-container') as HTMLElement;
        if (isLoading) {
            loadingDiv.style.display = 'block';
            formContainer.style.display = 'none';
        } else {
            loadingDiv.style.display = 'none';
            formContainer.style.display = 'block';
        }
    }



}

if (!customElements.get('modal-remove-game')) {
    customElements.define('modal-remove-game', RemoveGameModal);
}