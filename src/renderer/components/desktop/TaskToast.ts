import toastHtml from '/templates/task-toast.html?raw';

interface TaskEvent {
    taskId: string;
    eventType: TaskEventType;
    message: string;
    progress?: number; // 0-100
    error?: string;
}

enum TaskStatus { PENDING, RUNNING, COMPLETED, FAILED }
enum TaskEventType { START, PROGRESS, COMPLETE, FAIL }
enum TaskType {
    DownloadImages
}


export class TaskToast extends HTMLElement {

    constructor() {
        super();
        this.render();
        this.attachEvents();
    }

    attachEvents() {

        window.electronAPI.onBackgroundTask((event: any) => {
            const { eventType, message, progress, error } = event;

            this.updateToast(message, eventType, progress);

        });

    }

    private render() {
        this.innerHTML = toastHtml;
        console.log("Task Toast Rendered")
    }

    updateToast(message: string, type: TaskEventType, progress: number) {
        const spanMessage = this.querySelector(".span-message")
        const toast = this as HTMLElement;

        if (!spanMessage || !toast) return;

        switch (type) {
            case TaskEventType.START:
                toast!.style.display = 'flex';
                break;
            case TaskEventType.PROGRESS:
                if (progress !== undefined) {
                    spanMessage.textContent = `${message} (${progress}%)`;
                } else {
                    spanMessage.textContent = message;
                }
                break;
            case TaskEventType.COMPLETE:
                toast.style.display = 'flex';
                spanMessage.innerHTML = `<i class="bi bi-check-lg"></i> ${message}`
                setTimeout(() => {
                    toast!.style.display = 'none';
                }, 3000);
                break;
            case TaskEventType.FAIL:
                toast!.style.display = 'flex';
                spanMessage.innerHTML = `<i class="bi bi-x-lg"></i> ${message}`
                setTimeout(() => {
                    toast!.style.display = 'none';
                }, 5000);
                break;
        }

    }

}

if (!customElements.get('task-toast')) {
    customElements.define('task-toast', TaskToast);
}