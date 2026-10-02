import { computed, onMounted, onUnmounted, ref, toRaw, watch } from 'vue';
import type { Analysis, DataRow, Draft, Field, JobResult, Template } from '../domain/models';
import type { Progress } from '../domain/processing';
import { rowErrors, filename } from '../domain/fields';
import { LocalProcessingProvider } from '../infrastructure/processing/local-provider';
import { repository } from '../infrastructure/persistence/db';
import { readFile, errorMessage } from '../shared/files';
import { useSession } from '../app/session';
import { snapshot } from '../shared/snapshot';
import { processingLimits } from '../domain/limits';
export function useCreation() {
  const template = ref<Template>();
  const analysis = ref<Analysis>();
  const rows = ref<DataRow[]>([{}]);
  const step = ref(0);
  const maxStep = ref(0);
  const busy = ref(false);
  const error = ref('');
  const notice = ref('');
  const draft = ref<Draft>();
  const result = ref<JobResult>();
  const progress = ref<Progress>({ current: 0, total: 1, stage: 'Подготовка' });
  const preview = ref<Uint8Array>();
  const previewRow = ref(0);
  const excluded = ref<number[]>([]);
  const provider = new LocalProcessingProvider();
  const session = useSession();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const valid = computed(() =>
    rows.value.map((row, index) => ({ row, index, errors: rowErrors(template.value?.fields || [], row) })),
  );
  const ready = computed(() =>
    valid.value.filter((v) => !v.errors.length && !excluded.value.includes(v.index)),
  );
  const problems = computed(() => valid.value.filter((v) => v.errors.length));
  const fileExamples = computed(() => {
    const used = new Set<string>();
    return ready.value
      .slice(0, 3)
      .map((r, i) => filename(template.value?.filename || '', template.value?.fields || [], r.row, i, used));
  });
  async function act<T>(fn: () => Promise<T>): Promise<T | undefined> {
    busy.value = true;
    error.value = '';
    progress.value = { current: 0, total: 1, stage: 'Подготовка' };
    try {
      return await fn();
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      busy.value = false;
    }
  }
  async function open(t: Template, initial = 1) {
    const parsed = await provider.run('analyze', toRaw(t.source));
    template.value = t;
    analysis.value = parsed;
    rows.value = [{}];
    step.value = initial;
    maxStep.value = initial;
    result.value = undefined;
    preview.value = undefined;
    excluded.value = [];
  }
  async function load(files: File[]) {
    const file = files[0];
    if (!file) return;
    if (!/\.docx$/iu.test(file.name)) {
      error.value = 'Выберите файл .docx. DOC, DOCM и PDF не поддерживаются.';
      return;
    }
    await act(async () => {
      await open(
        {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.docx$/iu, ''),
          source: await readFile(file),
          fields: [],
          filename: '',
          updatedAt: Date.now(),
        },
        0,
      );
      template.value!.fields = analysis.value!.fields;
      maxStep.value = 1;
    });
  }
  function go(next: number) {
    step.value = next;
    maxStep.value = Math.max(maxStep.value, next);
  }
  function fields(value: Field[]) {
    if (template.value) template.value.fields = value;
    preview.value = undefined;
  }
  async function save() {
    if (!template.value) return;
    if (!template.value.name.trim()) {
      error.value = 'Введите название шаблона.';
      return;
    }
    await act(async () => {
      const t = snapshot(template.value!);
      t.updatedAt = Date.now();
      await repository.saveTemplate(t);
      notice.value = 'Шаблон сохранён только на этом устройстве.';
    });
  }
  async function persist() {
    if (!template.value || disposed) return;
    try {
      await repository.saveDraft({
        template: snapshot(template.value),
        rows: snapshot(rows.value),
        step: Math.min(step.value, 3),
        updatedAt: Date.now(),
      });
    } catch {
      notice.value = 'Не удалось сохранить черновик: проверьте свободное место и разрешения браузера.';
    }
  }
  async function restore() {
    if (!draft.value) return;
    const d = draft.value;
    await act(async () => {
      await open(d.template, d.step);
      rows.value = d.rows;
      draft.value = undefined;
    });
  }
  async function discard() {
    await act(async () => {
      await repository.clearDraft();
      draft.value = undefined;
    });
  }
  async function showPreview() {
    if (!template.value || !rows.value[previewRow.value]) return;
    await act(async () => {
      preview.value = await provider.run('preview', {
        source: toRaw(template.value!.source),
        fields: snapshot(template.value!.fields),
        row: toRaw(rows.value[previewRow.value]),
      });
    });
  }
  async function generate() {
    if (!template.value || !ready.value.length) return;
    await act(async () => {
      result.value = await provider.run(
        'generate',
        {
          source: toRaw(template.value!.source),
          fields: snapshot(template.value!.fields),
          rows: ready.value.map((v) => toRaw(v.row)),
          filename: template.value!.filename,
          rowNumbers: ready.value.map((v) => v.index + 1),
        },
        (p) => (progress.value = p),
      );
      go(4);
      if (!result.value.errors.length) await repository.clearDraft();
    });
  }
  watch(
    [template, rows, step],
    () => {
      preview.value = undefined;
      if (timer) clearTimeout(timer);
      if (step.value < 4) timer = setTimeout(() => void persist(), 650);
    },
    { deep: true },
  );
  watch(rows, () => {
    excluded.value = [];
    previewRow.value = Math.min(previewRow.value, Math.max(0, rows.value.length - 1));
  });
  watch(previewRow, () => {
    preview.value = undefined;
  });
  watch(
    [template, rows],
    () => {
      result.value = undefined;
      if (maxStep.value === 4) maxStep.value = 3;
    },
    { deep: true },
  );
  onMounted(async () => {
    if (session.selected) {
      const t = snapshot(session.selected);
      session.selected = undefined;
      await act(() => open(t, 2));
    } else {
      try {
        draft.value = await repository.draft();
      } catch {
        notice.value = 'Локальное хранилище недоступно. Работа с файлами всё равно доступна.';
      }
    }
  });
  onUnmounted(() => {
    if (timer) clearTimeout(timer);
    if (step.value < 4) void persist();
    disposed = true;
    provider.cancel();
  });
  return {
    softDocuments: processingLimits.softDocuments,
    template,
    analysis,
    rows,
    step,
    maxStep,
    busy,
    error,
    notice,
    draft,
    result,
    progress,
    preview,
    previewRow,
    excluded,
    valid,
    ready,
    problems,
    fileExamples,
    load,
    go,
    fields,
    save,
    restore,
    discard,
    showPreview,
    generate,
    cancel: () => provider.cancel(),
  };
}
