<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { snapshot } from '../shared/snapshot';
import { useRouter } from 'vue-router';
import type { Template } from '../domain/models';
import { repository } from '../infrastructure/persistence/db';
import { LocalProcessingProvider } from '../infrastructure/processing/local-provider';
import { download, errorMessage, readFile } from '../shared/files';
import { useSession } from '../app/session';
import Button from '../shared/ui/Button.vue';
import Alert from '../shared/ui/Alert.vue';
import DzhuraIcon from '../shared/ui/DzhuraIcon.vue';
defineProps<{ compact?: boolean }>();
const templates = ref<Template[]>([]);
const error = ref('');
const busy = ref(false);
const deleting = ref('');
const provider = new LocalProcessingProvider();
const router = useRouter();
const session = useSession();
async function refresh() {
  templates.value = await repository.templates();
}
async function action(fn: () => Promise<void>) {
  busy.value = true;
  error.value = '';
  try {
    await fn();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    busy.value = false;
  }
}
function use(t: Template) {
  session.selected = t;
  void router.push('/create');
}
async function exportFile(t: Template) {
  await action(async () => {
    download(
      await provider.run('exportTemplate', snapshot(t)),
      `${t.name.replace(/[<>:"/\\|?*]/gu, '_')}.dzhura`,
    );
  });
}
async function importFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await action(async () => {
    if (!/\.dzhura$/iu.test(file.name)) throw new Error('Выберите файл .dzhura.');
    const t = await provider.run('importTemplate', await readFile(file));
    await repository.saveTemplate(t);
    await refresh();
  });
  input.value = '';
}
async function remove(id: string) {
  await action(async () => {
    await repository.deleteTemplate(id);
    deleting.value = '';
    await refresh();
  });
}
onMounted(() => action(refresh));
onUnmounted(() => provider.cancel());
</script>
<template>
  <section class="stack">
    <div class="row between">
      <div>
        <h2 class="library-title">
          Мои шаблоны <span class="count">{{ templates.length }}</span>
        </h2>
        <small>Сохранено только на этом устройстве</small>
      </div>
      <label class="import"
        ><span><DzhuraIcon name="upload" :size="17" />Импорт .dzhura</span
        ><input type="file" accept=".dzhura" :disabled="busy" @change="importFile"
      /></label>
    </div>
    <Alert v-if="error" kind="error">{{ error }}</Alert>
    <p v-if="busy" role="status">Обрабатываем шаблон…</p>
    <div v-if="!templates.length && !busy" class="template-empty">
      <span class="empty-icon" aria-hidden="true"><DzhuraIcon name="document" :size="35" /></span>
      <div>
        <strong>Здесь будет начало вашей следующей работы</strong>
        <p>
          Настройте поля один раз и сохраните документ как шаблон.<br />В следующий раз останется только
          заполнить данные.
        </p>
      </div>
      <RouterLink to="/guide#templates" class="library-link"
        >О шаблонах <DzhuraIcon name="arrow-up-right" :size="16"
      /></RouterLink>
    </div>
    <div v-else class="template-grid">
      <article v-for="t in compact ? templates.slice(0, 3) : templates" :key="t.id" class="card stack">
        <span class="badge">DOCX · {{ t.fields.length }} полей</span>
        <h3>{{ t.name }}</h3>
        <small>{{ new Date(t.updatedAt).toLocaleDateString('ru-RU') }}</small
        ><Button :disabled="busy" @click="use(t)"
          >Заполнить данные <DzhuraIcon name="arrow-right" :size="17"
        /></Button>
        <div class="row">
          <Button variant="ghost" :disabled="busy" @click="exportFile(t)">Экспорт</Button
          ><Button variant="ghost" :disabled="busy" @click="deleting = t.id">Удалить</Button>
        </div>
        <Alert v-if="deleting === t.id">
          Удалить шаблон с этого устройства?
          <div class="row">
            <Button variant="danger" @click="remove(t.id)">Да, удалить</Button
            ><Button @click="deleting = ''">Отмена</Button>
          </div>
        </Alert>
      </article>
    </div>
    <RouterLink v-if="compact && templates.length > 3" to="/templates" class="library-link"
      >Показать все шаблоны <DzhuraIcon name="arrow-right" :size="16" /></RouterLink
    ><small v-if="templates.length"
      >Браузер может очистить локальные данные. Экспортируйте важные шаблоны в .dzhura для резервной
      копии.</small
    >
  </section>
</template>
<style scoped>
.library-title {
  margin-bottom: var(--space-1);
}
.count {
  font-size: 14px;
  color: var(--muted);
  margin-left: var(--space-2);
}
.template-empty {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-6);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  background: linear-gradient(125deg, var(--surface-elevated), var(--surface));
  box-shadow:
    var(--shadow),
    inset 0 1px 0 #fff;
}
.template-empty strong {
  font-size: 15px;
  font-weight: 500;
}
.template-empty p {
  font-size: 13px;
  color: var(--muted);
  margin: var(--space-2) 0 0;
}
.template-empty a {
  margin-left: auto;
  white-space: nowrap;
  font-size: 13px;
}
.empty-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  flex: 0 0 54px;
  border-radius: 14px;
  background: var(--accent-soft);
  color: var(--primary);
}
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-4);
}
.template-grid h3 {
  margin: 0;
}
.template-grid .card {
  transition:
    transform var(--motion),
    box-shadow var(--motion);
}
.template-grid .card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-raised);
}
.import {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  padding: 8px 13px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-elevated);
  box-shadow: var(--shadow);
  font-size: 13px;
  color: var(--primary);
  cursor: pointer;
}
.import span,
.library-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.import:hover {
  transform: translateY(-1px);
  border-color: var(--primary);
}
.library-link {
  font-weight: 600;
  text-decoration: none;
}
.import input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  cursor: pointer;
}
.import:focus-within {
  outline: 3px solid var(--primary);
}
@media (max-width: 650px) {
  .template-empty {
    align-items: start;
    flex-direction: column;
  }
  .template-empty a {
    margin: 0;
  }
}
</style>
