import { randomInt } from 'crypto';
import { BrowserWindow } from 'electron';

export enum TaskStatus { PENDING, RUNNING, COMPLETED, FAILED }
export enum TaskEventType { START, PROGRESS, COMPLETE, FAIL }
export enum TaskType {
    DownloadImages
}

export interface TaskEvent {
    taskId: string;
    eventType: TaskEventType;
    message: string;
    progress?: number; // 0-100
    error?: string;
}

class BackgroundTaskService {
    private tasks = new Map<string, TaskEvent>();

    /**
     * Inicia una nueva tarea.     
     * @param message Mensaje inicial (ej. 'Descargando imágenes...')
     */
    startTask(message: string, taskType: TaskType): string {
        const taskId = `t${taskType}-${randomInt(10000)}`;

        this.emitToAllWindows({
            taskId: taskId,
            eventType: TaskEventType.START,
            message,
        });

        return taskId;
    }

    /**
     * Actualiza el progreso de una tarea.
     */
    updateProgress(taskId: string, message: string, progress?: number): void {
        this.emitToAllWindows({
            taskId,
            eventType: TaskEventType.PROGRESS,
            message,
            progress,
        });
    }

    /**
     * Marca una tarea como completada con éxito.
     */
    completeTask(taskId: string, message: string): void {
        this.emitToAllWindows({
            taskId,
            eventType: TaskEventType.COMPLETE,
            message,
        });
        this.tasks.delete(taskId);
    }

    /**
     * Marca una tarea como fallida.
     */
    failTask(taskId: string, message: string, error?: string): void {
        this.emitToAllWindows({
            taskId,
            eventType: TaskEventType.FAIL,
            message,
            error,
        });
        this.tasks.delete(taskId);
    }

    private emitToAllWindows(event: TaskEvent): void {
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('background-task', event);
        });
    }
}

export const backgroundTask = new BackgroundTaskService();