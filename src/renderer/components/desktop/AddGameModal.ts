import modalHtml from '../../templates/modal-add-game.html?raw';

let modalInstance: HTMLDialogElement | null = null;
let protonVersionsCache: any[] | null = null;  // Cache de versiones

export async function initAddGameModal() {
    console.log('Initializing Add Game Modal');

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

        const openModalBtn = document.querySelector('#btn-add-game-modal');
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

            // Leer archivo de imagen si existe
            const fileInput = document.getElementById('gridImageFile') as HTMLInputElement;
            let imageBuffer: ArrayBuffer | null = null;
            let imageExt: string | null = null;

            if (fileInput.files && fileInput.files[0]) {
                imageExt = fileInput.files[0].name.split('.').pop() || 'png';
                imageBuffer = await fileInput.files[0].arrayBuffer(); // Leer el archivo como ArrayBuffer
            }
            const gameData = extractGameDataFromForm(form);

            console.log("AddGameModal, Post, GameData:", gameData)

            const createResult = await window.electronAPI.invoke('add-manual-game', { gameData, imageBuffer, imageExt });
            if (createResult.success) {
                window.dispatchEvent(new CustomEvent('games-updated'));
                dialog.close();
                form.reset();
            } else {
                alert('Error: ' + createResult.error);
            }
        });

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
            console.log("Cargando Versiones de Proton desde Cache")
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
        select.innerHTML = '<option value=""></option>';

        console.log("Versions:", versions);
        for (const ver of versions) {
            const option = document.createElement('option');
            option.value = ver.path;
            option.textContent = ver.name;
            select.appendChild(option);
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