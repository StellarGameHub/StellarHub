import { GameCategory } from '../../../shared/types';
import badgeHtml from '../../templates/category-badge.html?raw';

export class CategoryBadge extends HTMLElement {


    private GameCategory: GameCategory | null = null;

    setGameCategory(gc: GameCategory) {
        this.GameCategory = gc;
        if (this.isConnected) {
            this.updateBadge();
        }
    }

    constructor() {
        super();

    }

    connectedCallback() {
        this.render();
        this.attachEvents();
        this.updateBadge();
    }

    attachEvents() {


    }

    private render() {
        this.innerHTML = badgeHtml;
        this.classList.add('category-badge')
        console.log("Task Toast Rendered")
    }

    private updateBadge() {
        if (!this.GameCategory) return;

        this.dataset.categoryId = this.GameCategory.id;

        const image = this.querySelector("img") as HTMLImageElement;
        if (image) image.src = `stellarhub://${this.GameCategory.icon}`;

        const span = this.querySelector("span") as HTMLElement;
        if (span) span.textContent = this.GameCategory.name;
    }


}

if (!customElements.get('category-badge')) {
    customElements.define('category-badge', CategoryBadge);
}