import modalHtml from '/templates/modals/modal-app-settings.html?raw';

export class AppSettingsModal extends HTMLElement {
  private dialog!: HTMLDialogElement;
  private loadingDiv!: HTMLElement;
  private formContainer!: HTMLElement;
  private form!: HTMLFormElement;

  connectedCallback() {
    this.render();
    this.attachEvents();
    this.loadSettings();
  }

  private render() {
    this.innerHTML = modalHtml;
    this.dialog = this.querySelector('#app-settings-modal') as HTMLDialogElement;
    this.loadingDiv = this.querySelector('#modal-loading') as HTMLElement;
    this.formContainer = this.querySelector('#modal-form-container') as HTMLElement;
    this.form = this.querySelector('#settings-form') as HTMLFormElement;
  }

  private attachEvents() {
    const closeBtn = this.querySelector('#close-settings-modal');
    closeBtn?.addEventListener('click', () => this.close());

    const enableCheckbox = this.querySelector('#steamgriddb-enabled') as HTMLInputElement;
    const apiGroup = this.querySelector('#steamgriddb-api-group') as HTMLElement;

    enableCheckbox?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      if (apiGroup) apiGroup.style.opacity = checked ? '1' : '0.5';
    });

    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveSettings();
      this.close();
      window.dispatchEvent(new CustomEvent('settings-updated'));
    });
  }

  private async loadSettings() {
    this.showLoading(true);
    const settings = await window.electronAPI.invoke('get-app-settings');
    const enableCheck = this.querySelector('#steamgriddb-enabled') as HTMLInputElement;
    const apiKeyInput = this.querySelector('#steamgriddb-api-key') as HTMLInputElement;
    const fullscreenCheck = this.querySelector('#launch-fullscreen') as HTMLInputElement;

    enableCheck.checked = settings.steamGridDB.enabled;
    apiKeyInput.value = settings.steamGridDB.apiKey || '';
    fullscreenCheck.checked = settings.launchInFullscreen;

    // Aplicar opacidad según estado inicial
    const apiGroup = this.querySelector('#steamgriddb-api-group') as HTMLElement;
    if (apiGroup) apiGroup.style.opacity = settings.steamGridDB.enabled ? '1' : '0.5';

    this.showLoading(false);
  }

  private async saveSettings() {
    const enableCheck = this.querySelector('#steamgriddb-enabled') as HTMLInputElement;
    const apiKeyInput = this.querySelector('#steamgriddb-api-key') as HTMLInputElement;
    const fullscreenCheck = this.querySelector('#launch-fullscreen') as HTMLInputElement;

    const settings = {
      steamGridDB: {
        enabled: enableCheck.checked,
        apiKey: apiKeyInput.value.trim() || undefined
      },
      launchInFullscreen: fullscreenCheck.checked
    };
    await window.electronAPI.invoke('save-app-settings', settings);
  }

  showLoading(isLoading: boolean) {
    if (isLoading) {
      this.loadingDiv.style.display = 'block';
      this.formContainer.style.display = 'none';
    } else {
      this.loadingDiv.style.display = 'none';
      this.formContainer.style.display = 'block';
    }
  }

  open() {
    this.dialog.showModal();
    this.loadSettings();
  }

  close() {
    this.dialog.close();
  }
}

if (!customElements.get('modal-app-settings')) {
  customElements.define('modal-app-settings', AppSettingsModal);
}