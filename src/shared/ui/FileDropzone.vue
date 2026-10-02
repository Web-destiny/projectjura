<script setup lang="ts">
import { ref } from 'vue';
import DzhuraIcon from './DzhuraIcon.vue';
defineProps<{ accept: string; multiple?: boolean; title?: string; hint?: string; disabled?: boolean }>();
const emit = defineEmits<{ files: [File[]] }>();
const over = ref(false);
function drop(e: DragEvent) {
  over.value = false;
  if (e.dataTransfer?.files.length) emit('files', Array.from(e.dataTransfer.files));
}
function choose(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) emit('files', Array.from(input.files));
  input.value = '';
}
</script>
<template>
  <label
    class="dropzone"
    :class="{ over }"
    @dragover.prevent="over = true"
    @dragleave.prevent="over = false"
    @drop.prevent="!disabled && drop($event)"
    ><span class="upload-icon" aria-hidden="true"><DzhuraIcon name="upload" :size="28" /></span
    ><strong>{{ title || 'Перетащите документ сюда' }}</strong
    ><span>или <span class="choose">выберите файл</span> на компьютере</span
    ><small>{{ hint || 'Файлы останутся на вашем устройстве' }}</small
    ><input type="file" :accept="accept" :multiple="multiple" :disabled="disabled" @change="choose"
  /></label>
</template>
<style scoped>
.dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-7);
  min-height: 260px;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(ellipse 45% 65% at 50% 18%, color-mix(in srgb, var(--primary) 8%, transparent), transparent 100%),
    linear-gradient(160deg, var(--surface-elevated), var(--surface));
  box-shadow: var(--shadow), inset 0 1px 0 #fff;
  cursor: pointer;
  text-align: center;
  transition: border-color var(--motion), box-shadow var(--motion), transform var(--motion), background var(--motion);
}
.dropzone:hover,
.over {
  border-color: var(--primary);
  background:
    radial-gradient(ellipse 45% 65% at 50% 18%, color-mix(in srgb, var(--primary) 14%, transparent), transparent 100%),
    linear-gradient(160deg, var(--surface-elevated), var(--surface));
  box-shadow: var(--shadow-raised), inset 0 1px 0 #fff;
  transform: translateY(-2px);
}
.dropzone:active { transform: translateY(0); }
.dropzone:focus-within {
  outline: 3px solid var(--primary);
  outline-offset: 4px;
}
.upload-icon {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  background: var(--accent-soft);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 4px 10px #33241915, inset 0 1px 0 #fff8;
  color: var(--primary);
}
.dropzone strong {
  font-size: 18px;
}
.choose {
  color: var(--primary);
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
}
.dropzone input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
</style>
