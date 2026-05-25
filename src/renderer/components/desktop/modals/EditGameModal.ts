import { GameSource } from '../../../../shared/enums';
import { AppSettings, Game } from '../../../../shared/types';
import { withButtonLoading } from '../../../utils/uiHelpers';
import modalHtml from '/templates/modals/modal-edit-game.html?raw';


export class EditGameModal extends HTMLElement {

    private dialog!: HTMLDialogElement;
    private protonVersionsCache: any[] | null = null;
    private currentGameId: string | null = null;
    private gameSource: GameSource | null = null;

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
        const form = this.dialog.querySelector('#edit-game-form') as HTMLFormElement;
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = this.dialog.querySelector("button[type=submit]") as HTMLButtonElement;
            if (submitButton) {

                await withButtonLoading(submitButton, (async () => {

                    const gameData = await this.extractGameDataFromForm(form);
                    // gameData contiene todos los campos del formulario + los archivos de imagen
                    const updateResult = await window.electronAPI.invoke('update-game', {
                        gameId: this.currentGameId,
                        gameSource: this.gameSource,
                        updates: gameData,
                        imageData: gameData.imageData
                    });
                    if (updateResult.success) {
                        window.dispatchEvent(new CustomEvent('games-updated',{
                            bubbles: true,
                            composed: true,
                        }));
                        this.close();
                    } else {
                        alert('Error: ' + updateResult.error);
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

        //BOTONES DE CLEAR IMAGENEs

        // this.dialog.querySelectorAll('.clear-image').forEach(btn => {
        //     btn.addEventListener('click', (e) => {
        //         const type = (btn as HTMLElement).dataset.type;
        //         if (!type) return;
        //         // Clear preview and file input
        //         const preview = this.querySelector(`#preview-${type}`) as HTMLImageElement;
        //         if (preview) preview.src = '';
        //         const fileInput = this.querySelector(`#${type}ImageFile`) as HTMLInputElement;
        //         if (fileInput) fileInput.value = '';
        //         // Mark that this image should be cleared on save
        //         const imageField = btn.closest('.image-field');
        //         if (imageField) imageField.setAttribute('data-clear', 'true');
        //     });
        // });

        //MOSTAR PREVIEW DE IMAGEN SELECCIONADA

        const fileInputs = this.dialog.querySelectorAll<HTMLInputElement>('input[type="file"]');

        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => {

                const target = e.currentTarget as HTMLInputElement;
                const file = target.files?.[0];

                if (!file) return;

                const container = target.closest('.image-field');
                const preview = container?.querySelector<HTMLImageElement>('.image-preview');
                if (!preview) return;

                const imageUrl = URL.createObjectURL(file);

                preview.src = imageUrl;

                preview.onload = () => {
                    URL.revokeObjectURL(imageUrl);
                };
            });

        });
    }

    async open(gameId: string) {
        this.currentGameId = gameId;
        this.dialog.showModal();

        this.showLoading(true);

        await this.loadProtonVersionsWithCache();
        await this.loadGameData();

        this.showLoading(false);

    }

    close() {
        this.dialog.close();
        this.querySelector("#section-manual-game")?.classList.add('display-none');
        this.currentGameId = null;
        const form = this.dialog.querySelector('#edit-game-form') as HTMLFormElement;
        form?.reset();
    }

    private showLoading(isLoading: boolean) {
        const loadingDiv = this.dialog.querySelector('#modal-loading') as HTMLElement;
        const formContainer = this.dialog.querySelector('#modal-form-container') as HTMLElement;
        if (isLoading) {
            loadingDiv.style.display = 'flex';
            formContainer.style.display = 'none';
        } else {
            loadingDiv.style.display = 'none';
            formContainer.style.display = 'flex';
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

    private async loadGameData() {
        const game = await window.electronAPI.invoke("get-game-detail", this.currentGameId) as Game;
        if (!game) return;
        this.gameSource = game.source;

        //DATA COMPARTIDA
        const title = (this.querySelector('#title') as HTMLInputElement);
        if (title) title.value = game.title;

        const developerInput = this.querySelector('#developer') as HTMLInputElement;
        if (developerInput) {
            developerInput.value = game.developers?.join(', ') || '';
        }
        const publisherInput = this.querySelector('#publisher') as HTMLInputElement;
        if (publisherInput) {
            publisherInput.value = game.publishers?.join(', ') || '';
        }
        const genresInput = this.querySelector('#genres') as HTMLInputElement;
        if (genresInput) {
            genresInput.value = game.genres?.join(', ') || '';
        }
        const releaseDate = this.querySelector('#releaseDate') as HTMLInputElement;
        if (releaseDate) releaseDate.value = game.releaseDate?.toString() || '';
        const description = this.querySelector('#description') as HTMLTextAreaElement;
        if (description) description.value = game.description || '';

        switch (game.source) {
            case GameSource.MANUAL:
                this.querySelector("#section-manual-game")?.classList.remove('display-none');


                const execPath = (this.querySelector('#executablePath') as HTMLInputElement);
                if (execPath) execPath.value = game.launchConfig.executablePath;
                const winePrefix = (this.querySelector('#wine-prefix') as HTMLInputElement);
                if (winePrefix && game.launchConfig.winePrefix) winePrefix.value = game.launchConfig.winePrefix;
                const protonVersion = (this.querySelector('#protonVersion') as HTMLSelectElement);
                if (protonVersion && game.launchConfig.protonVersion) protonVersion.value = game.launchConfig.protonVersion;
                const launchArgsRaw = (this.querySelector('#launchArgs') as HTMLInputElement);
                if (launchArgsRaw && game.launchConfig.launchArgs) launchArgsRaw.value = game.launchConfig.launchArgs.concat().toString();
                const gameArgsRaw = (this.querySelector('#gameArgs') as HTMLInputElement);
                if (gameArgsRaw && game.launchConfig.gameArgs) gameArgsRaw.value = game.launchConfig.gameArgs.concat().toString();
                const mangoHud = (this.querySelector('#mangoHud') as HTMLSelectElement);
                if (mangoHud && game.launchConfig.enableMangoHud) mangoHud.value = game.launchConfig.enableMangoHud ? "Yes" : "No";
                //CAMBIAR ESTO COMO SE GUARDA PARA PODER TOMARLO FACIL SI TIENE O NO
                const gameModeSelect = this.querySelector('#gameMode') as HTMLSelectElement;
                if (gameModeSelect) {
                    const hasGameMode = game.launchConfig.environment?.GAMEMODERUN === '1';
                    gameModeSelect.value = hasGameMode ? 'true' : 'false';
                }
                break;

        }


        ///CARGAR IMAGENES

        const imgPreviewGrid = this.querySelector("#preview-grid") as HTMLImageElement;
        if (imgPreviewGrid && game.gameImages.grid) imgPreviewGrid.src = `stellarhub://${game.gameImages.grid}`
        const imgPreviewWideGrid = this.querySelector("#preview-widegrid") as HTMLImageElement;
        if (imgPreviewWideGrid && game.gameImages.wideGrid) imgPreviewWideGrid.src = `stellarhub://${game.gameImages.wideGrid}`
        const imgPreviewWideHero = this.querySelector("#preview-hero") as HTMLImageElement;
        if (imgPreviewWideHero && game.gameImages.hero) imgPreviewWideHero.src = `stellarhub://${game.gameImages.hero}`
        const imgPreviewWideLogo = this.querySelector("#preview-logo") as HTMLImageElement;
        if (imgPreviewWideLogo && game.gameImages.logo) imgPreviewWideLogo.src = `stellarhub://${game.gameImages.logo}`
        const imgPreviewWideIcon = this.querySelector("#preview-icon") as HTMLImageElement;
        if (imgPreviewWideIcon && game.gameImages.icon) imgPreviewWideIcon.src = `stellarhub://${game.gameImages.icon}`
    }

    async extractGameDataFromForm(form: HTMLFormElement) {
        const formData = new FormData(form);


        // Convertir FormData a objeto plano
        const raw: Record<string, any> = {};
        for (const [key, value] of formData.entries()) {
            raw[key] = value;
        }

        console.log("FormData entries:", raw);

        // Procesar arrays
        const launchArgsRaw = raw.launchArgs?.toString() ?? '';
        const gameArgsRaw = raw.gameArgs?.toString() ?? '';

        const developersRaw: string = raw.developer?.toString() ?? '';
        const publishersRaw: string = raw.publisher?.toString() ?? '';
        const genresRaw: string = raw.genres?.toString() ?? '';

        const developers = developersRaw ? developersRaw.split(',').map(s => s.trim()).filter(s => s) : [];
        const publishers = publishersRaw ? publishersRaw.split(',').map(s => s.trim()).filter(s => s) : [];
        const genres = genresRaw ? genresRaw.split(',').map(s => s.trim()).filter(s => s) : [];

        const imageFiles = ['gridImage', 'wideGridImage', 'heroImage', 'logoImage', 'iconImage'];
        const imageData: Record<string, { buffer: number[], ext: string } | null> = {};

        for (const imageField of imageFiles) {
            const file = raw[imageField] as File;
            if (file && file.size > 0) {
                const arrayBuffer = await file.arrayBuffer();
                imageData[imageField] = {
                    buffer: Array.from(new Uint8Array(arrayBuffer)),
                    ext: file.name.split('.').pop() || 'png',
                }
            } else {
                imageData[imageField] = null;
            }
        }

        // Determinar fuente (puedes detectar por la presencia de ciertos campos)
        // Como este modal es para editar cualquier juego, mejor pasar el source original desde fuera.
        // Por ahora asumimos manual, pero deberías recibir el game original.

        return {
            title: raw.title?.toString() ?? '',
            description: raw.description?.toString() ?? '',
            developers: developers,
            publishers: publishers,
            releaseYear: raw.releaseYear ? parseInt(raw.releaseYear.toString()) : undefined,
            genres: genres,
            launchConfig: {
                executablePath: raw.executablePath?.toString() ?? '',
                winePrefix: raw.winePrefix?.toString() || undefined,
                protonVersion: raw.protonVersion?.toString() || undefined,
                launchArgs: launchArgsRaw ? launchArgsRaw.split(' ') : [],
                gameArgs: gameArgsRaw ? gameArgsRaw.split(' ') : [],
                enableMangoHud: raw.mangoHud === 'true',
                enableGamescope: false,
                environment: raw.gameMode === 'true' ? { GAMEMODERUN: '1' } : {},
            },
            imageData: imageData,
        };
    }

}

if (!customElements.get('modal-edit-game')) {
    customElements.define('modal-edit-game', EditGameModal);
}