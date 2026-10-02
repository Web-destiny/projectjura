import { nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue';
import type { DataRow, EditDraft, Field, JobResult, OutputFile, ReplaceRule } from '../domain/models';
import { repository } from '../infrastructure/persistence/db';
import { snapshot } from '../shared/snapshot';
export function useEditDraft(state: {
  files: Ref<OutputFile[]>;
  mode: Ref<string>;
  fields: Ref<Field[]>;
  rows: Ref<DataRow[]>;
  rule: Ref<ReplaceRule>;
  result: Ref<JobResult | undefined>;
  notice: Ref<string>;
}) {
  const draft = ref<EditDraft>();
  const recovering = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function save() {
    if (!state.files.value.length || (state.result.value&&!state.result.value.errors.length)) return;
    try {
      await repository.saveEditDraft(
        snapshot({
          files: state.files.value,
          mode: state.mode.value,
          fields: state.fields.value,
          rows: state.rows.value,
          rule: state.rule.value,
          updatedAt: Date.now(),
        }),
      );
    } catch {
      state.notice.value = 'Не удалось сохранить черновик изменения. Проверьте свободное место в браузере.';
    }
  }
  async function restore() {
    if (!draft.value) return;
    recovering.value = true;
    const d = draft.value;
    state.files.value = d.files;
    state.mode.value = d.mode;
    state.fields.value = d.fields;
    state.rows.value = d.rows;
    state.rule.value = d.rule;
    draft.value = undefined;
    await nextTick();
    recovering.value = false;
  }
  async function discard() {
    try {
      await repository.clearEditDraft();
      draft.value = undefined;
    } catch {
      state.notice.value = 'Не удалось очистить локальный черновик.';
    }
  }
  watch(
    [state.files, state.mode, state.fields, state.rows, state.rule],
    () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (state.files.value.length) void save();
        else void discard();
      }, 650);
    },
    { deep: true },
  );
  onMounted(async () => {
    try {
      draft.value = await repository.editDraft();
    } catch {
      state.notice.value = 'Черновики недоступны: проверьте разрешения браузера.';
    }
  });
  onUnmounted(() => {
    if (timer) clearTimeout(timer);
    void save();
  });
  return { editDraft: draft, recovering, restoreEdit: restore, discardEdit: discard };
}
