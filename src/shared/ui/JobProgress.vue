<script setup lang="ts">
import type { Progress } from '../../domain/processing';
import Button from './Button.vue';
import ProgressBar from './Progress.vue';
defineProps<{ progress: Progress }>();
defineEmits<{ cancel: [] }>();
</script>
<template>
  <div class="card stack" role="status" aria-live="polite">
    <div class="row between">
      <strong>{{ progress.stage }}</strong
      ><Button @click="$emit('cancel')">Отменить</Button>
    </div>
    <ProgressBar :label="progress.stage" :value="progress.current" :max="progress.total" /><small
      >{{ progress.current }} из {{ progress.total }}</small
    >
  </div>
</template>
<style scoped>
progress {
  width: 100%;
  accent-color: var(--primary);
  height: 12px;
}
</style>
