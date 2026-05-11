// src/renderer/components/AddScanConfigModal.ts
import modalHtml from '/templates/modals/modal-add-scan-config.html?raw';
import { GameCategory, ScanConfig } from '../../../../shared/types';

export class AddScanConfigModal extends HTMLElement {
    private dialog!: HTMLDialogElement;
    private currentConfigId: string | null = null;

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    private render() {
        this.innerHTML = modalHtml;
        this.dialog = this.querySelector('dialog')!;
    }

    private attachEvents() {
        // Cerrar modal
        const closeBtn = this.querySelector('#close-scan-modal');
        closeBtn?.addEventListener('click', () => this.close());

        // Submit del formulario
        const form = this.querySelector('#scan-config-form') as HTMLFormElement;
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const config = this.getConfigFromForm();
            if (this.currentConfigId) config.id = this.currentConfigId;
            else config.id = `scan-${Date.now()}`;
            await window.electronAPI.invoke('save-scan-config', config);
            this.close();
            this.dispatchEvent(new CustomEvent('scan-configs-updated', {
                bubbles: true,
                composed: true
            }));
        });

        // Browse roms folder button event
        const browseRomsBtn = this.querySelector('#btn-browse-roms');
        browseRomsBtn?.addEventListener('click', async () => {
            const folder = await window.electronAPI.invoke('select-folder');
            if (folder) {
                (this.querySelector('#romsFolder') as HTMLInputElement).value = folder;
            }
        });

        // Browse emulator button event
        const browseEmuBtn = this.querySelector('#btn-browse-emulator');
        browseEmuBtn?.addEventListener('click', async () => {
            const file = await window.electronAPI.invoke('select-file');
            if (file) {
                (this.querySelector('#emulatorPath') as HTMLInputElement).value = file;
            }
        });
    }

    private getConfigFromForm(): ScanConfig {
        const categoriesSelect = this.querySelector('#select-categories') as HTMLSelectElement;
        const selectedCategories = Array.from(categoriesSelect.selectedOptions).map(opt => opt.value);

        return {
            id: '',
            systemName: (this.querySelector('#systemName') as HTMLInputElement).value,
            romsFolder: (this.querySelector('#romsFolder') as HTMLInputElement).value,
            emulatorPath: (this.querySelector('#emulatorPath') as HTMLInputElement).value,
            launchArguments: (this.querySelector('#launchArguments') as HTMLInputElement).value,
            extensions: (this.querySelector('#extensions') as HTMLInputElement).value.split(',').map(s => s.trim()),
            enabled: (this.querySelector('#enabled') as HTMLInputElement).checked,
            categories: selectedCategories,
        };
    }

    async open(config?: ScanConfig) {
        // Cargar categorías antes de mostrar
        await this.loadCategories();

        // Resetear formulario
        const form = this.querySelector('#scan-config-form') as HTMLFormElement;
        form?.reset();

        this.currentConfigId = config?.id || null;

        if (config) {
            // Rellenar datos para edición
            (this.querySelector('#systemName') as HTMLInputElement).value = config.systemName;
            (this.querySelector('#romsFolder') as HTMLInputElement).value = config.romsFolder;
            (this.querySelector('#emulatorPath') as HTMLInputElement).value = config.emulatorPath;
            (this.querySelector('#launchArguments') as HTMLInputElement).value = config.launchArguments;
            (this.querySelector('#extensions') as HTMLInputElement).value = config.extensions.join(', ');
            (this.querySelector('#enabled') as HTMLInputElement).checked = config.enabled;

            // Seleccionar las categorías asociadas
            const categoriesSelect = this.querySelector('#select-categories') as HTMLSelectElement;
            if (config.categories) {
                for (let i = 0; i < categoriesSelect.options.length; i++) {
                    const opt = categoriesSelect.options[i];
                    opt.selected = config.categories.includes(opt.value);
                }
            }
        }

        this.dialog.showModal();
    }

    close() {
        this.dialog.close();
        const form = this.querySelector('#scan-config-form') as HTMLFormElement;
        form?.reset();
        this.currentConfigId = null;
    }

    private async loadCategories() {
        const result = await window.electronAPI.invoke('get-game-categories');
        const categoriesSelect = this.querySelector('#select-categories') as HTMLSelectElement;
        if (!categoriesSelect) return;

        categoriesSelect.innerHTML = '';
        if (result.success) {
            const categories: GameCategory[] = result.categories;
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                categoriesSelect.appendChild(option);
            });
        } else {
            console.error('Error loading categories:', result.error);
        }
    }
}

if (!customElements.get('modal-add-scan-config')) {
    customElements.define('modal-add-scan-config', AddScanConfigModal);
}