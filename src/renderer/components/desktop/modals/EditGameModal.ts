import { AppSettings } from '../../../../shared/types';
import { withButtonLoading } from '../../../utils/uiHelpers';
import modalHtml from '/templates/modals/modal-add-game.html?raw';


export class AddGameModal extends HTMLElement {

    private dialog!: HTMLDialogElement;

    private protonVersionsCache: any[] | null = null;

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
        const form = this.dialog.querySelector('#manual-game-form') as HTMLFormElement;
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            console.log("AddGameModal Form submited")
            const submitButton = this.dialog.querySelector("button[type=submit]") as HTMLButtonElement

            if (submitButton) {

                await withButtonLoading(submitButton, (async () => {

                    const gameData = this.extractGameDataFromForm(form);

                    console.log("AddGameModal, gameData:", gameData);

                    const createResult = await window.electronAPI.invoke('add-manual-game', gameData);
                    if (createResult.success) {
                        window.dispatchEvent(new CustomEvent('games-updated'));
                        this.dialog.close();
                        form.reset();
                    } else {
                        alert('Error: ' + createResult.error);
                    }

                })());

            }

        });

        // BROWSE GAME BUTTON EVENT

        const browseGameBtn = this.querySelector('#btn-browse-game');
        browseGameBtn?.addEventListener('click', async () => {
            const file = await window.electronAPI.invoke('select-file');
            if (file) {
                (this.querySelector('#executablePath') as HTMLInputElement).value = file;
            }
        });
        // BROWSE PREFIX BUTTON EVENT
        const browsePrefixBtn = this.querySelector('#btn-browse-prefix');
        browsePrefixBtn?.addEventListener('click', async () => {
            const file = await window.electronAPI.invoke('select-folder');
            if (file) {
                (this.querySelector('#wine-prefix') as HTMLInputElement).value = file;
            }
        });

        const appSettings = await window.electronAPI.invoke("get-app-settings") as AppSettings;

        if (appSettings.defaultWinePrefix) {

            const gameTitleInput = this.querySelector("#title") as HTMLInputElement;
            const gamePrefixInput = this.querySelector("#wine-prefix") as HTMLInputElement;

            gameTitleInput?.addEventListener("input", () => {
                gamePrefixInput.value =
                    appSettings.defaultWinePrefix + "/" + gameTitleInput.value.toLowerCase().trim().replaceAll(" ", "-");
            })
        }

        // CLOSE MODAL BUTON
        const closeBtn = this.querySelector('#close-modal');

        closeBtn?.addEventListener('click', () => {
            this.close();
        });
    }

    async open() {

        this.dialog.showModal();

        this.showLoading(true);

        await this.loadProtonVersionsWithCache();

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

    private async loadProtonVersionsWithCache() {
        if (this.protonVersionsCache !== null) {
            // Usar caché
            console.log("Cargando Versiones de Proton desde Cache")
            this.populateProtonSelect(this.protonVersionsCache);
            return;
        }

        const result = await window.electronAPI.invoke('get-proton-versions');
        if (result.success) {
            this.protonVersionsCache = result.versions;
            this.populateProtonSelect(result.versions);
        } else {
            console.error('Error loading Proton versions:', result.error);
            // Mostrar mensaje de error en el select
            const select = this.dialog.querySelector('#protonVersion') as HTMLSelectElement;
            if (select) {
                select.innerHTML = '<option value="">Error al cargar versiones</option>';
            }
        }
    }

    populateProtonSelect(versions: any[]) {
        const select = this.dialog.querySelector('#protonVersion') as HTMLSelectElement;
        if (!select) return;
        select.innerHTML = '<option value=""></option>';

        console.log("Versions:", versions);
        for (const ver of versions) {
            const option = document.createElement('option');
            option.value = ver.path;
            option.textContent = ver.name;
            select.appendChild(option);
        }
    }

    extractGameDataFromForm(form: HTMLFormElement) {
        const title = (form.querySelector('#title') as HTMLInputElement).value;
        const execPath = (form.querySelector('#executablePath') as HTMLInputElement).value;
        const winePrefix = (form.querySelector('#wine-prefix') as HTMLInputElement).value;
        const protonVersion = (form.querySelector('#protonVersion') as HTMLSelectElement).value;
        const launchArgsRaw = (form.querySelector('#launchArgs') as HTMLInputElement).value;
        const gameArgsRaw = (form.querySelector('#gameArgs') as HTMLInputElement).value;
        const mangoHud = (form.querySelector('#mangoHud') as HTMLSelectElement).value === 'true';
        const gameMode = (form.querySelector('#gameMode') as HTMLSelectElement).value === 'true';

        return {
            title,
            description: '',
            developers: [],
            releaseDate: undefined,
            images: { cover: '', grid: '', banner: '' },
            isInstalled: true,
            source: 'manual' as const,
            launchConfig: {
                executablePath: execPath,
                winePrefix: winePrefix || undefined,
                protonVersion: protonVersion || undefined,
                launchArgs: launchArgsRaw ? launchArgsRaw.split(' ') : [],
                gameArgs: gameArgsRaw ? gameArgsRaw.split(' ') : [],
                enableMangoHud: mangoHud,
                enableGamescope: false,
                environment: gameMode ? { GAMEMODERUN: '1' } : {},
            }
        };
    }

}

if (!customElements.get('modal-add-game')) {
    customElements.define('modal-add-game', AddGameModal);
}