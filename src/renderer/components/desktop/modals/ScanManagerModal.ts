// src/renderer/components/ModalScanManager.ts
import modalHtml from '/templates/modals/modal-scan-manager.html?raw';
import { ScanConfig } from '../../../../shared/types';
import './AddScanConfigModal';
import { AddScanConfigModal } from './AddScanConfigModal';

export class ScanManagerModal extends HTMLElement {
  private dialog!: HTMLDialogElement;
  private configs: ScanConfig[] = [];

  connectedCallback() {
    this.render();
    this.attachEvents();
  }

  private render() {
    this.innerHTML = modalHtml;
    this.dialog = this.querySelector('dialog')!;
  }

  private attachEvents() {
    const closeBtn = this.querySelector('#btn-close-scan-manager');
    closeBtn?.addEventListener('click', () => this.close());

    const addNewBtn = this.querySelector('#btn-add-new-scan');
    addNewBtn?.addEventListener('click', () => {
      // Para abrir el modal en modo creación

      const addScanConfigModal = document.querySelector('modal-add-scan-config') as AddScanConfigModal;
      if (addScanConfigModal) {
        addScanConfigModal.open();
      }
    });

    // Delegación de eventos para los botones dinámicos (editar, eliminar, escanear)
    this.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const card = target.closest('.scan-config-item') as HTMLElement;
      if (!card) return;
      const configId = card.getAttribute('data-id');
      const config = this.configs.find(c => c.id === configId);

      if (target.closest('.edit-config')) {
        if (config) {
          const addScanConfigModal = document.querySelector('modal-add-scan-config') as AddScanConfigModal;
          if (addScanConfigModal) {
            addScanConfigModal.open(config);
          }
        }
      } else if (target.closest('.delete-config')) {
        if (confirm('¿Eliminar esta configuración?')) {
          await window.electronAPI.invoke('delete-scan-config', configId);
          await this.loadConfigs(); // recargar
        }
      } else if (target.closest('.run-scan')) {
        const result = await window.electronAPI.invoke('run-scan', configId);
        alert(`Escaneo completado: ${result.added} juegos añadidos, ${result.removed} eliminados.`);
        window.dispatchEvent(new CustomEvent('games-updated'));
        await this.loadConfigs(); // actualizar fecha último escaneo si quisieras mostrar
      }
    });

    // Recargar cuando se actualicen configuraciones desde otro lugar
    this.addEventListener('scan-configs-updated', () => this.loadConfigs());
  }

  async open() {
    this.dialog.showModal();
    await this.loadConfigs();
  }

  close() {
    this.dialog.close();
  }

  private async loadConfigs() {
    try {
      this.configs = await window.electronAPI.invoke('get-scan-configs') as ScanConfig[];
      const container = this.querySelector('#div-scan-manager-content');
      if (!container) return;
      container.innerHTML = '';
      const template = this.querySelector('#template-scan-config-item') as HTMLTemplateElement;
      if (!template) return;

      for (const config of this.configs) {
        const clone = document.importNode(template.content, true);
        const item = clone.firstElementChild as HTMLElement;
        if (!item) continue;
        item.setAttribute('data-id', config.id);
        item.querySelector('.system-name')!.textContent = config.systemName;
        item.querySelector('.roms-folder')!.textContent = config.romsFolder;
        const enabledSpan = item.querySelector('.enabled')!;
        enabledSpan.textContent = config.enabled ? '✅ Activado' : '❌ Desactivado';
        // Opcional: mostrar lastScanAt
        const lastScanSpan = item.querySelector('.last-scan');
        if (lastScanSpan && config.lastScanAt) {
          lastScanSpan.textContent = new Date(config.lastScanAt).toLocaleString();
        }
        container.appendChild(item);
      }
    } catch (err) {
      console.error('Error loading scan configs:', err);
    }
  }
}

if (!customElements.get('modal-scan-manager')) {
  customElements.define('modal-scan-manager', ScanManagerModal);
}