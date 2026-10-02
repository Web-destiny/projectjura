<script setup lang="ts">
import { ref } from 'vue';
import type { JobResult } from '../domain/models';
import { download } from '../shared/files';
import { csvReport } from '../infrastructure/spreadsheet/engine';
import Button from '../shared/ui/Button.vue';
import Alert from '../shared/ui/Alert.vue';
defineProps<{ result: JobResult; excluded?: number }>();
const all = ref(false);
</script>
<template>
  <div class="card stack">
    <span class="result-icon" aria-hidden="true">✓</span>
    <h2>{{ result.files.length ? 'Документы готовы' : 'Обработка завершена' }}</h2>
    <p class="muted">
      Создано: {{ result.files.length }} · исключено: {{ excluded || 0 }} · ошибок: {{ result.errors.length }}
    </p>
    <Button
      v-if="result.files.length"
      variant="primary"
      @click="
        download(
          result.archive || result.files[0].bytes,
          result.archive ? 'Документы.zip' : result.files[0].name,
        )
      "
    >
      ↓ Скачать {{ result.archive ? 'ZIP' : 'DOCX' }}
    </Button>
    <ul>
      <li v-for="file in all ? result.files : result.files.slice(0, 5)" :key="file.name">{{ file.name }}</li>
    </ul>
    <Button v-if="result.files.length > 5" variant="ghost" @click="all = !all">
      {{ all ? 'Свернуть' : 'Показать все' }} </Button
    ><Alert v-if="result.errors.length">
      Некоторые документы не созданы. Скачайте отчёт, исправьте исходные данные и повторите обработку. </Alert
    ><Button
      v-if="result.errors.length"
      @click="download(csvReport(result.errors), 'Отчёт.csv', 'text/csv;charset=utf-8')"
    >
      Скачать отчёт CSV
    </Button>
  </div>
</template>
<style scoped>
.result-icon {
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--success);
  border-radius: 50%;
  width: 56px;
  height: 56px;
  font-size: 28px;
}
h2,
p {
  margin: 0;
}
ul {
  margin: 0;
  padding-left: var(--space-5);
  color: var(--muted);
  font-size: 14px;
}
</style>
