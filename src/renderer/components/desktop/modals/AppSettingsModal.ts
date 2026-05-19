import { AppSettings } from '../../../../shared/types';
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

    // BROWSE PREFIX BUTTON EVENT
    const browsePrefixBtn = this.querySelector('#btn-browse-prefix');
    browsePrefixBtn?.addEventListener('click', async () => {
      const file = await window.electronAPI.invoke('select-folder');
      if (file) {
        (this.querySelector('#wine-prefix') as HTMLInputElement).value = file;
      }
    });

    //Steam LOGIN
    const steamLoginButton = this.querySelector("#btn-steam-login");
    steamLoginButton?.addEventListener("click", async (e) => {
      e.preventDefault();
      const result = await window.electronAPI.invoke("steam-login");

      if (result.success) {
        const steamClientIdInput = this.querySelector("#steam-client-id") as HTMLInputElement;
        if (steamClientIdInput) steamClientIdInput.value = result.steamId;
      }
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
    const settings = await window.electronAPI.invoke('get-app-settings') as AppSettings;

    const sgdbRnableCheck = this.querySelector('#steamgriddb-enabled') as HTMLInputElement;
    const sgdbApiKeyInput = this.querySelector('#steamgriddb-api-key') as HTMLInputElement;
    const fullscreenCheck = this.querySelector('#launch-fullscreen') as HTMLInputElement;
    const defaultWinePrefix = this.querySelector("#wine-prefix") as HTMLInputElement;

    const steamApiKeyInput = this.querySelector('#steam-api-key') as HTMLInputElement;
    const steamClientIDInput = this.querySelector('#steam-client-id') as HTMLInputElement;
    const steamEnableCkeck = this.querySelector('#steam-enabled') as HTMLInputElement;

    sgdbRnableCheck.checked = settings.steamGridDB.enabled;
    sgdbApiKeyInput.value = settings.steamGridDB.apiKey || '';
    fullscreenCheck.checked = settings.launchInFullscreen;
    defaultWinePrefix.value = settings.defaultWinePrefix || '';
    steamApiKeyInput.value = settings.steam?.apiKey || '';
    steamEnableCkeck.checked = settings.steam?.enabled;
    steamClientIDInput.value = settings.steam?.clientId || '';

    // Aplicar opacidad según estado inicial
    const apiGroup = this.querySelector('#steamgriddb-api-group') as HTMLElement;
    if (apiGroup) apiGroup.style.opacity = settings.steamGridDB.enabled ? '1' : '0.5';

    this.showLoading(false);
  }

  private async saveSettings() {
    const sgdbEnableCheck = this.querySelector('#steamgriddb-enabled') as HTMLInputElement;
    const sgdbApiKeyInput = this.querySelector('#steamgriddb-api-key') as HTMLInputElement;
    const steamApiKeyInput = this.querySelector('#steam-api-key') as HTMLInputElement;
    const steamEnableCkeck = this.querySelector('#steam-enabled') as HTMLInputElement;
    const steamClientIDInput = this.querySelector('#steam-client-id') as HTMLInputElement;

    const fullscreenCheck = this.querySelector('#launch-fullscreen') as HTMLInputElement;
    const defaultWinePrefix = this.querySelector("#wine-prefix") as HTMLInputElement;

    let defaultWinePrefixValue = defaultWinePrefix.value.trim();

    if (defaultWinePrefixValue.endsWith("/")) defaultWinePrefixValue = defaultWinePrefixValue.slice(0, -1);

    const settings = {
      steam: {
        enabled: steamEnableCkeck.checked,
        apiKey: steamApiKeyInput.value.trim() || undefined,
        clientId: steamClientIDInput.value.trim() || undefined
      },
      steamGridDB: {
        enabled: sgdbEnableCheck.checked,
        apiKey: sgdbApiKeyInput.value.trim() || undefined
      },
      launchInFullscreen: fullscreenCheck.checked,
      defaultWinePrefix: defaultWinePrefixValue
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