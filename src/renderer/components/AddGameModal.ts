import modalHtml from '../templates/modal-add-game.html?raw';

let modalInstance: HTMLDialogElement | null = null;
let protonVersionsCache: any[] | null = null;  // Cache de versiones

export async function initAddGameModal() {
    if (!modalInstance) {
        const dialog = document.createElement('dialog');
        dialog.id = 'add-game-modal';
        dialog.innerHTML = `
        <div class="modal-content">
            <div id="modal-loading" style="text-align:center; padding:2rem;">
            <div class="spinner"></div>                
            </div>
            <div id="modal-form-container" style="display:none;">
                ${modalHtml}
            </div>
        </div>`;
        document.body.appendChild(dialog);

        modalInstance = dialog;

        const openModalBtn = document.querySelector('.btn-add-game-modal');
        openModalBtn?.addEventListener('click', async () => {
            // Mostrar modal inmediatamente con loading
            dialog.showModal();
            showLoading(dialog, true);

            // Cargar versiones (con caché)
            await loadProtonVersionsWithCache(dialog);

            // Mostrar formulario
            showLoading(dialog, false);
        });

        const closeBtn = () => {
            const btn = dialog.querySelector('#close-modal');
            if (btn) {
                btn.addEventListener('click', () => {
                    dialog.close();
                    const form = dialog.querySelector('#manual-game-form') as HTMLFormElement;
                    form?.reset();
                });
            }
        };
        closeBtn();

        const form = dialog.querySelector('#manual-game-form') as HTMLFormElement;
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const gameData = extractGameDataFromForm(form);
            const createResult = await window.electronAPI.invoke('add-manual-game', gameData);
            if (!createResult.success) {
                alert('Error: ' + createResult.error);
                return;

            }


            // Si hay archivo de imagen seleccionado, lo guardamos
            const fileInput = document.getElementById('gridImageFile') as HTMLInputElement;
            if (fileInput.files && fileInput.files[0]) {
                const newGameId = createResult.gameId;
                saveImage(newGameId, fileInput.files[0]);
            }

            window.dispatchEvent(new CustomEvent('games-updated'));
            dialog.close();
            form.reset();
        });

    }

    function saveImage(gameID: string, file: File) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const arrayBuffer = ev.target?.result as ArrayBuffer;
            const buffer = Buffer.from(arrayBuffer);
            const ext = file.name.split('.').pop() || 'png';
            const savedPath = await window.electronAPI.invoke('save-grid-image-buffer', {
                gameId: gameID,
                buffer: Array.from(buffer), // Enviar como array para serialización
                ext
            });
            if (savedPath) {
                // Actualizar el juego con la ruta de imagen
                await window.electronAPI.invoke('update-game-image', { gameId: gameID, imagePath: savedPath, imageType: 'grid' });
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function showLoading(dialog: HTMLDialogElement, isLoading: boolean) {
        const loadingDiv = dialog.querySelector('#modal-loading') as HTMLElement;
        const formContainer = dialog.querySelector('#modal-form-container') as HTMLElement;
        if (isLoading) {
            loadingDiv.style.display = 'block';
            formContainer.style.display = 'none';
        } else {
            loadingDiv.style.display = 'none';
            formContainer.style.display = 'block';
        }
    }

    async function loadProtonVersionsWithCache(dialog: HTMLDialogElement) {
        if (protonVersionsCache !== null) {
            // Usar caché
            populateProtonSelect(dialog, protonVersionsCache);
            return;
        }

        const result = await window.electronAPI.invoke('get-proton-versions');
        if (result.success) {
            protonVersionsCache = result.versions;
            populateProtonSelect(dialog, result.versions);
        } else {
            console.error('Error loading Proton versions:', result.error);
            // Mostrar mensaje de error en el select
            const select = dialog.querySelector('#protonVersion') as HTMLSelectElement;
            if (select) {
                select.innerHTML = '<option value="">Error al cargar versiones</option>';
            }
        }
    }

    function populateProtonSelect(dialog: HTMLDialogElement, versions: any[]) {
        const select = dialog.querySelector('#protonVersion') as HTMLSelectElement;
        if (!select) return;
        select.innerHTML = '<option value="">Proton por defecto</option>';
        for (const ver of versions) {
            const option = document.createElement('option');
            option.value = ver.path;
            option.textContent = ver.name;
            select.appendChild(option);
        }
    }




    async function loadProtonVersions(dialog: HTMLDialogElement) {
        const result = await window.electronAPI.invoke('get-proton-versions');
        const select = dialog.querySelector('#protonVersion') as HTMLSelectElement;
        select.innerHTML = '<option value="">Proton por defecto</option>';
        if (result.success) {
            result.versions.forEach((ver: any) => {
                const option = document.createElement('option');
                option.value = ver.path;
                option.textContent = ver.name;
                select.appendChild(option);
            });
        }
    }

    function extractGameDataFromForm(form: HTMLFormElement) {
        const title = (form.querySelector('#title') as HTMLInputElement).value;
        const execPath = (form.querySelector('#executablePath') as HTMLInputElement).value;
        const winePrefix = (form.querySelector('#winePrefix') as HTMLInputElement).value;
        const protonVersion = (form.querySelector('#protonVersion') as HTMLSelectElement).value;
        const launchArgsRaw = (form.querySelector('#launchArgs') as HTMLInputElement).value;
        const gameArgsRaw = (form.querySelector('#gameArgs') as HTMLInputElement).value;
        const mangoHud = (form.querySelector('#mangoHud') as HTMLSelectElement).value === 'true';
        const gameMode = (form.querySelector('#gameMode') as HTMLSelectElement).value === 'true';

        return {
            title,
            description: '',
            developers: [],
            releaseYear: undefined,
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