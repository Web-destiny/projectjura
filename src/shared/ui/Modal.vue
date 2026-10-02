<script setup lang="ts">
import { nextTick, ref, watch, useId } from 'vue';
import IconButton from './IconButton.vue';
defineProps<{ title: string }>();
const open = defineModel<boolean>({ default: false });
const dialog = ref<HTMLDialogElement>();
const id = useId();
watch([open, dialog], async () => {
  await nextTick();
  if (open.value && !dialog.value?.open) dialog.value?.showModal();
  else if (!open.value && dialog.value?.open) dialog.value.close();
});
</script>
<template>
  <dialog
    ref="dialog"
    class="modal"
    :aria-labelledby="id"
    @cancel.prevent="open = false"
    @close="open = false"
  >
    <div class="row between">
      <h2 :id="id">{{ title }}</h2>
      <IconButton label="Закрыть окно" @click="open = false">×</IconButton>
    </div>
    <slot />
  </dialog>
</template>
<style scoped>
.modal {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  padding: var(--space-5);
  width: min(560px, calc(100% - var(--space-6)));
  box-shadow: var(--shadow-raised);
}
.modal::backdrop {
  background: rgb(48 43 39 / 35%);
}
h2 {
  margin: 0;
}
.row {
  margin-bottom: var(--space-5);
}
</style>
