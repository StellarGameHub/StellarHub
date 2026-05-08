import modalHtml from '../../templates/modals/modal-add-roms-scan.html?raw';
import { GameCategory, ScanConfig } from '../../../shared/types';

let modalInstance: HTMLDialogElement | null = null;
let currentConfigId: string | null = null;

export async function initAddScanConfigModal() {
  console.log('Initializing Scan Config Modal');

  if (!modalInstance) {

    const dialog = document.createElement('dialog');
    dialog.id = 'new-scan-config-modal';
    dialog.innerHTML = `<div class="modal-content">${modalHtml}</div>`;
    document.body.appendChild(dialog);
    modalInstance = dialog;

    const closeBtn = dialog.querySelector('#close-scan-modal');
    closeBtn?.addEventListener('click', () => dialog.close());

    const form = dialog.querySelector('#scan-config-form') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const config = getConfigFromForm();
      if (currentConfigId) config.id = currentConfigId;
      else config.id = `scan-${Date.now()}`;
      await window.electronAPI.invoke('save-scan-config', config);
      dialog.close();
      window.dispatchEvent(new CustomEvent('scan-configs-updated')); // Evento para actualizar los configs en el Modal Padre
    });

    // Botones de examinar
    const browseRomsBtn = dialog.querySelector('#browseRomsFolder');
    browseRomsBtn?.addEventListener('click', async () => {
      const folder = await window.electronAPI.invoke('select-folder');
      if (folder) (dialog.querySelector('#romsFolder') as HTMLInputElement).value = folder;
    });

    // 
    const browseEmuBtn = dialog.querySelector('#browseEmulator');
    browseEmuBtn?.addEventListener('click', async () => {
      const file = await window.electronAPI.invoke('select-file');
      if (file) (dialog.querySelector('#emulatorPath') as HTMLInputElement).value = file;
    });
  }

  function getConfigFromForm(): ScanConfig {
    const dialog = modalInstance!;

    return {
      id: '',
      systemName: (dialog.querySelector('#systemName') as HTMLInputElement).value,
      romsFolder: (dialog.querySelector('#romsFolder') as HTMLInputElement).value,
      emulatorPath: (dialog.querySelector('#emulatorPath') as HTMLInputElement).value,
      launchArguments: (dialog.querySelector('#launchArguments') as HTMLInputElement).value,
      extensions: (dialog.querySelector('#extensions') as HTMLInputElement).value.split(',').map(s => s.trim()),
      enabled: (dialog.querySelector('#enabled') as HTMLInputElement).checked,
      categories: Array.from(((dialog.querySelector("#select-categories") as HTMLSelectElement).selectedOptions)).map(option => option.value)
    };
  }
}

export async function openScanConfigModal(config?: ScanConfig) {
  if (!modalInstance) return;
  const form = modalInstance.querySelector('#scan-config-form') as HTMLFormElement;
  form.reset();
  currentConfigId = config?.id || null;

  //Traer categorias  
  let categories: GameCategory[] = [];
  await window.electronAPI.invoke('get-game-categories').then(result => {
    categories = result.categories;
  });

  //Llenar el Select de Categorias
  let categoriesSelect = modalInstance.querySelector("#select-categories") as HTMLSelectElement;
  if (categoriesSelect) {
    categoriesSelect.innerHTML = "";
    categories.forEach(category => {
      let option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categoriesSelect?.appendChild(option);
    })
  }
  // Si hay config (SE ESTA EDITANDO UNA CATEGORIA) llenar los datos
  if (config) {
    (modalInstance.querySelector('#systemName') as HTMLInputElement).value = config.systemName;
    (modalInstance.querySelector('#romsFolder') as HTMLInputElement).value = config.romsFolder;
    (modalInstance.querySelector('#emulatorPath') as HTMLInputElement).value = config.emulatorPath;
    (modalInstance.querySelector('#launchArguments') as HTMLInputElement).value = config.launchArguments;
    (modalInstance.querySelector('#extensions') as HTMLInputElement).value = config.extensions.join(', ');
    (modalInstance.querySelector('#enabled') as HTMLInputElement).checked = config.enabled;

    for (let option of categoriesSelect.options) {
      option.selected = config.categories?.includes(option.value) ?? false;
    }

  }
  modalInstance.showModal();
}