import modalHtml from '../../templates/modals/modal-scan-manager.html?raw';

import { ScanConfig } from '../../../shared/types';
import { initAddScanConfigModal, openScanConfigModal } from './AddScanConfigModal';

let modalInstance: HTMLDialogElement | null = null;


export async function initScanManagerModal() {
  if (!modalInstance) {
    const dialog = document.createElement('dialog');
    dialog.id = 'scan-config-modal';
    dialog.innerHTML = modalHtml;
    document.body.appendChild(dialog);
    modalInstance = dialog;

    const closeBtn = dialog.querySelector('#btn-close-scan-manager');
    closeBtn?.addEventListener('click', () => dialog.close());

    const openModalBtn = document.querySelector('#btn-manage-scans-modal');
    openModalBtn?.addEventListener('click', async () => {
      // Mostrar modal inmediatamente con loading
      initAddScanConfigModal();
      dialog.showModal();
    });


    async function loadConfigs() {
      const configs = await window.electronAPI.invoke('get-scan-configs') as ScanConfig[];
      const container = dialog.querySelector("#div-scan-manager-content");

      if (!container) return;
      
      let scansContainer = dialog.querySelector("#div-scan-manager-content");
      if (!scansContainer) return;
      //Vaciar la Lista
      scansContainer.innerHTML = "";
      
      let template = dialog.querySelector("#template-scan-config-item") as HTMLTemplateElement;;

      configs.map(config => {
        let scanConfigItem = document.importNode(template.content, true).firstElementChild?.cloneNode(true) as HTMLElement;
        scanConfigItem.setAttribute("data-id", config.id);
        scanConfigItem.querySelector(".system-name")!.textContent = config.systemName;
        scanConfigItem.querySelector(".roms-folder")!.textContent = config.romsFolder;
        scanConfigItem.querySelector(".enabled")!.textContent = config.enabled ? "✅ Activado" : "❌ Desactivado";

        scansContainer?.appendChild(scanConfigItem);
      })

      // Eventos dinámicos
      document.querySelectorAll('.edit-config').forEach(btn => {
        const id = btn.closest('.scan-config-item')?.getAttribute('data-id');
        const config = configs.find(c => c.id === id);
        btn.addEventListener('click', () => openScanConfigModal(config));
      });
      document.querySelectorAll('.delete-config').forEach(async btn => {
        const id = btn.closest('.scan-config-item')?.getAttribute('data-id');
        btn.addEventListener('click', async () => {
          if (confirm('¿Eliminar esta configuración?')) {
            await window.electronAPI.invoke('delete-scan-config', id);
            loadConfigs(); // recargar
          }
        });
      });
      document.querySelectorAll('.run-scan').forEach(btn => {
        const id = btn.closest('.scan-config-item')?.getAttribute('data-id');
        btn.addEventListener('click', async () => {
          const result = await window.electronAPI.invoke('run-scan', id);
          alert(`Escaneo completado: ${result.added} juegos añadidos, ${result.removed} eliminados.`);
          window.dispatchEvent(new CustomEvent('games-updated'));
        });
      });

      document.getElementById('btn-add-new-scan')?.addEventListener('click', () => openScanConfigModal());
    }

    await loadConfigs();
    window.addEventListener('scan-configs-updated', () => loadConfigs());
  }
}