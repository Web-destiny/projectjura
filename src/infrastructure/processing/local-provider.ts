import type { ProcessingProvider, Progress, TaskMap } from '../../domain/processing';
export class LocalProcessingProvider implements ProcessingProvider {
  private worker?: Worker;
  private reject?: (reason: Error) => void;
  run<K extends keyof TaskMap>(
    task: K,
    input: TaskMap[K]['input'],
    progress?: (value: Progress) => void,
  ): Promise<TaskMap[K]['output']> {
    this.cancel();
    const worker = new Worker(new URL('../../workers/processing.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker = worker;
    return new Promise((resolve, reject) => {
      this.reject = reject;
      const finish = () => {
        worker.terminate();
        if (this.worker === worker) {
          this.worker = undefined;
          this.reject = undefined;
        }
      };
      worker.onmessage = (event: MessageEvent) => {
        const message = event.data;
        if (message.type === 'progress') progress?.(message.value);
        else {
          finish();
          if (message.type === 'error') reject(new Error(message.message));
          else resolve(message.value);
        }
      };
      worker.onerror = () => {
        finish();
        reject(new Error('Обработка прервана. Попробуйте меньшую пачку или другой файл.'));
      };
      worker.postMessage({ task, input });
    });
  }
  cancel() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
      this.reject?.(new Error('Операция отменена. Исходные файлы не изменены.'));
      this.reject = undefined;
    }
  }
}
