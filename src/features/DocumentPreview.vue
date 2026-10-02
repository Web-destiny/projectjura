<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { renderAsync } from 'docx-preview';
import Alert from '../shared/ui/Alert.vue';
import DzhuraSelect from '../shared/ui/DzhuraSelect.vue';
import { LocalProcessingProvider } from '../infrastructure/processing/local-provider';
const provider = new LocalProcessingProvider();
onUnmounted(() => {
  revision++;
  provider.cancel();
});
const props = defineProps<{ bytes: Uint8Array }>();
const html = ref('');
const loading = ref(false);
const error = ref('');
const zoom = ref('100');
const frameHtml = computed(() =>
  html.value.replace('<body>', `<body style="zoom:${Number(zoom.value) / 100}">`),
);
let revision = 0;
watch(
  () => props.bytes,
  async (bytes) => {
    const id = ++revision;
    loading.value = true;
    error.value = '';
    try {
      const host = document.createElement('div'),
        styles = document.createElement('div');
      const safeSource = await provider.run('renderSource', bytes);
      await renderAsync(new Uint8Array(safeSource), host, styles, {
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        renderHeaders: true,
        renderFooters: true,
        useBase64URL: true,
        renderAltChunks: false,
      });
      if (id !== revision) return;
      const pages = Array.from(host.querySelectorAll('section.docx'));
      pages.forEach((page, i) => (page.id = `page-${i + 1}`));
      const navigation =
        pages.length > 1
          ? `<nav aria-label="Страницы" style="position:sticky;top:0;background:#fffaf4;padding:8px;font:14px Arial;z-index:10">Страницы: ${pages.map((_, i) => `<a href="#page-${i + 1}" style="margin:0 8px;color:#80402c">${i + 1}</a>`).join('')}</nav>`
          : '';
      host.querySelectorAll('script,iframe,object,embed,link,meta,form').forEach((e) => e.remove());
      for (const e of host.querySelectorAll('*'))
        for (const a of Array.from(e.attributes))
          if (
            a.name.startsWith('on') ||
            (['href', 'src'].includes(a.name) && !a.value.startsWith('data:') && !a.value.startsWith('#'))
          )
            e.removeAttribute(a.name);
      html.value = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline';"><style>body{margin:0;background:#eee7dd}.docx-wrapper{padding:24px!important}section.docx{margin:0 auto 24px!important;box-shadow:0 3px 14px #0001!important}</style>${styles.innerHTML}</head><body>${navigation}${host.innerHTML}</body></html>`;
    } catch {
      error.value =
        'Не удалось отобразить страницы. Текстовое представление и обработка DOCX доступны отдельно.';
    } finally {
      if (id === revision) loading.value = false;
    }
  },
  { immediate: true },
);
</script>
<template>
  <section class="preview">
    <div class="toolbar between">
      <span class="muted">Предпросмотр DOCX · только чтение</span
      ><DzhuraSelect
        label="Масштаб"
        compact
        :model-value="zoom"
        :options="[
          { label: '75%', value: '75' },
          { label: '100%', value: '100' },
          { label: '125%', value: '125' },
        ]"
        @update:model-value="zoom = String($event)"
      />
    </div>
    <Alert v-if="error">{{ error }}</Alert>
    <p v-if="loading" role="status">Отрисовываем страницы…</p>
    <div v-else class="frame-scroll">
      <iframe
        v-if="html"
        title="Страницы документа"
        sandbox=""
        :srcdoc="frameHtml"
        :style="{ width: `${Number(zoom) * 8.5}px` }"
      ></iframe>
    </div>
    <small
      >Переносы и количество страниц могут отличаться от Microsoft Word. Проверьте готовый файл перед
      отправкой.</small
    >
  </section>
</template>
<style scoped>
.preview {
  min-width: 0;
}
.frame-scroll {
  overflow: auto;
  border-radius: var(--radius);
  background: var(--surface-alt);
  border: 1px solid var(--border);
}
iframe {
  display: block;
  min-width: 100%;
  height: 650px;
  border: 0;
}
.preview small {
  display: block;
  margin-top: var(--space-2);
}
</style>
