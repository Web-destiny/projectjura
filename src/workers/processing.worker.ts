import { execute } from './tasks';
import type { TaskMap } from '../domain/processing';
const scope = self as unknown as {
  onmessage:
    ((e: MessageEvent<{ task: keyof TaskMap; input: TaskMap[keyof TaskMap]['input'] }>) => void) | null;
  postMessage: (data: unknown) => void;
};
scope.onmessage = async ({ data }) => {
  try {
    const value = await execute(data.task, data.input, (value) =>
      scope.postMessage({ type: 'progress', value }),
    );
    scope.postMessage({ type: 'result', value });
  } catch (e) {
    scope.postMessage({
      type: 'error',
      message: e instanceof Error ? e.message : 'Не удалось обработать файл.',
    });
  }
};
