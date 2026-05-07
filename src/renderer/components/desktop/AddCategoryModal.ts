import { GameCategory } from '../../../shared/types';
import modalHtml from '../../templates/modal-add-category.html?raw';

let modalInstance: HTMLDialogElement | null = null;

export async function initAddCategoryModal() {
    console.log('Initializing Add Category Modal');
    if (!modalInstance) {
        const dialog = document.createElement('dialog');
        dialog.id = 'add-category-modal';
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

        const openModalBtn = document.querySelector('#btn-add-category-modal');
        openModalBtn?.addEventListener('click', async () => {
            // Mostrar modal inmediatamente con loading
            dialog.showModal();
            showLoading(dialog, true);

            // Cargar categorías
            await loadCategories(dialog);

            // Mostrar formulario
            showLoading(dialog, false);
        });

        // Configurar botón de cierre del modal
        const closeBtn = () => {
            const btn = dialog.querySelector('#close-modal');
            if (btn) {
                btn.addEventListener('click', () => {
                    dialog.close();
                    const form = dialog.querySelector('#categoies-form') as HTMLFormElement;
                    form?.reset();
                });
            }
        };
        // Llamar a closeBtn para configurar el evento de cierre
        closeBtn();

        const form = dialog.querySelector('#categoies-form') as HTMLFormElement;
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Leer archivo de imagen si existe
            const fileInput = document.getElementById('iconFile') as HTMLInputElement;
            let imageBuffer: ArrayBuffer | null = null;
            let imageExt: string | null = null;

            if (fileInput.files && fileInput.files[0]) {
                imageExt = fileInput.files[0].name.split('.').pop() || 'png';
                imageBuffer = await fileInput.files[0].arrayBuffer(); // Leer el archivo como ArrayBuffer
            }
            const categoryNameInput = document.getElementById('name') as HTMLInputElement;
            const categoryName = categoryNameInput.value.trim();

            const createResult = await window.electronAPI.invoke('add-game-category', { categoryName, imageBuffer, imageExt });
            if (createResult.success) {
                //AGREGAR TOAST DE ÉXITO AQUÍ                
                dialog.close();
                form.reset();
            } else {
                alert('Error: ' + createResult.error);
            }
        });

    }

    // Función para mostrar u ocultar el estado de carga en el modal
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

    // Función para cargar categorías desde el backend y mostrarlas en el modal
    async function loadCategories(dialog: HTMLDialogElement) {

        const result = await window.electronAPI.invoke('get-game-categories');
        if (result.success) {
            populateCategoriesList(dialog, result.categories);
        } else {
            console.error('Error loading game categories:', result.error);
            // Mostrar mensaje de error en el select
            const list = dialog.querySelector('#categories-list') as HTMLSelectElement;
            if (list) {
                list.innerHTML = '<li>Error al cargar categorías</li>';
            }
        }
    }

    // Función para mostrar las categorías en el modal
    function populateCategoriesList(dialog: HTMLDialogElement, categories: GameCategory[]) {
        const list = dialog.querySelector('#categories-list') as HTMLSelectElement;
        if (!list) return;
        list.innerHTML = '';
        var template = dialog.querySelector('#category-item-template') as HTMLTemplateElement;
        for (const category of categories) {
            const li = template?.content.cloneNode(true) as HTMLLIElement;
            li.querySelector('.category-icon')!.setAttribute('src', `estelarhub://${category.icon}`);
            li.querySelector('.category-name')!.textContent = category.name;
            li.querySelector('.remove-category-btn')!.addEventListener('click', async () => {
                try {
                    await window.electronAPI.invoke('delete-game-category', category.id);
                    // Recargar categorías después de eliminar
                    await loadCategories(dialog);
                } catch (error) {
                    //Deberia implementar TOast de error para estos casos
                    console.error('Error removing category:', (error as Error).message);
                }
            });
            list.appendChild(li);
        }
    }

}