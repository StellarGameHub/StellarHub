import { GameCategory } from '../../../shared/types';
import modalHtml from '../../templates/modals/modal-add-category.html?raw';

export class AddCategoryModal extends HTMLElement {

    private dialog!: HTMLDialogElement;

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    private render() {
        this.innerHTML = modalHtml;
        this.dialog = this.querySelector('dialog')!;
    }

    private attachEvents() {

        const closeBtn = this.querySelector('#close-modal');

        closeBtn?.addEventListener('click', () => {
            this.close();
        });

        const form = this.querySelector('#categoies-form') as HTMLFormElement;

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fileInput = this.querySelector('#iconFile') as HTMLInputElement;

            let imageBuffer: ArrayBuffer | null = null;
            let imageExt: string | null = null;

            if (fileInput.files?.[0]) {
                imageExt = fileInput.files[0].name.split('.').pop() || 'png';
                imageBuffer = await fileInput.files[0].arrayBuffer();
            }

            const categoryNameInput = this.querySelector('#name') as HTMLInputElement;

            const categoryName = categoryNameInput.value.trim();

            const createResult = await window.electronAPI.invoke(
                'add-game-category',
                {
                    categoryName,
                    imageBuffer,
                    imageExt
                }
            );

            if (createResult.success) {

                this.close();

                this.dispatchEvent(new CustomEvent('category-added', {
                    bubbles: true,
                    composed: true,
                    detail: {
                        categoryName
                    }
                }));

                form.reset();

                await this.loadCategories();

            } else {

                alert('Error: ' + createResult.error);

            }

        });
    }

    async open() {

        this.dialog.showModal();

        this.showLoading(true);

        await this.loadCategories();

        this.showLoading(false);

    }

    close() {

        this.dialog.close();

        const form = this.querySelector('#categoies-form') as HTMLFormElement;

        form?.reset();

    }

    private showLoading(isLoading: boolean) {

        const loadingDiv = this.querySelector('#modal-loading') as HTMLElement;

        const formContainer = this.querySelector('#modal-form-container') as HTMLElement;

        if (isLoading) {

            loadingDiv.style.display = 'block';
            formContainer.style.display = 'none';

        } else {

            loadingDiv.style.display = 'none';
            formContainer.style.display = 'block';

        }

    }

    private async loadCategories() {

        const result = await window.electronAPI.invoke('get-game-categories');

        if (result.success) {

            this.populateCategoriesList(result.categories);

        } else {

            console.error('Error loading game categories:', result.error);

            const list = this.querySelector('#categories-list');

            if (list) {
                list.innerHTML = '<li>Error al cargar categorías</li>';
            }

        }

    }

    private populateCategoriesList(categories: GameCategory[]) {

        const list = this.querySelector('#categories-list') as HTMLElement;

        if (!list) return;

        list.innerHTML = '';

        const template = this.querySelector('#category-item-template') as HTMLTemplateElement;

        for (const category of categories) {

            const li = template.content.cloneNode(true) as HTMLElement;

            li.querySelector('.category-icon')
                ?.setAttribute('src', `estelarhub://${category.icon}`);

            const name = li.querySelector('.category-name');

            if (name) {
                name.textContent = category.name;
            }

            li.querySelector('.remove-category-btn')
                ?.addEventListener('click', async () => {

                    try {

                        await window.electronAPI.invoke(
                            'delete-game-category',
                            category.id
                        );

                        await this.loadCategories();

                    } catch (error) {

                        console.error(
                            'Error removing category:',
                            (error as Error).message
                        );

                    }

                });

            list.appendChild(li);

        }

    }

}

if (!customElements.get('modal-add-category')) {
    customElements.define('modal-add-category', AddCategoryModal);
}