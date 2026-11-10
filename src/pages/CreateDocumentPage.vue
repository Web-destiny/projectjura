<script setup lang="ts">
import { useCreation } from '../features/useCreation';
import { documents } from '../shared/ru';
import Button from '../shared/ui/Button.vue';
import Alert from '../shared/ui/Alert.vue';
import Stepper from '../shared/ui/Stepper.vue';
import FileDropzone from '../shared/ui/FileDropzone.vue';
import JobProgress from '../shared/ui/JobProgress.vue';
import FieldEditor from '../features/FieldEditor.vue';
import DataEditor from '../features/DataEditor.vue';
import SpreadsheetImport from '../features/SpreadsheetImport.vue';
import DocumentPreview from '../features/DocumentPreview.vue';
import JobResult from '../features/JobResult.vue';
import DzhuraIcon from '../shared/ui/DzhuraIcon.vue';
import DzhuraSelect from '../shared/ui/DzhuraSelect.vue';
import Checkbox from '../shared/ui/Checkbox.vue';
const {
  softDocuments,
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
  outputFormat,
  autoGender,
  genderPair,
  genderReview,
  updateRows,
  setAutoGender,
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
  cancel,
} = useCreation();
const titles = [
  'Начнём с документа',
  'Отметьте, что будет меняться',
  'Заполните данные',
  'Всё готово к проверке',
  'Рутина закончилась',
];
</script>
<template>
  <div class="row between">
    <RouterLink to="/" class="back-link"><DzhuraIcon name="arrow-left" :size="17" />В мастерскую</RouterLink
    ><span class="pill">Создание из шаблона</span>
  </div>
  <div class="heading">
    <h1>{{ titles[step] }}</h1>
    <p>{{ template ? template.name : 'Загрузите Word-документ, который станет основой новых файлов.' }}</p>
  </div>
  <Stepper :step="step" :max="maxStep" :disabled="busy" @change="go" />
  <div class="section-gap stack">
    <Alert v-if="error" kind="error">{{ error }}</Alert
    ><Alert v-if="notice">{{ notice }}</Alert
    ><JobProgress v-if="busy" :progress="progress" @cancel="cancel" /><template v-if="!busy">
      <div v-if="draft && !template" class="card row between">
        <div>
          <strong>Продолжить незавершённую работу?</strong>
          <p class="muted">{{ draft.template.name }} · {{ draft.rows.length }} строк</p>
        </div>
        <div class="row">
          <Button @click="discard">Удалить черновик</Button
          ><Button variant="primary" @click="restore">Продолжить</Button>
        </div>
      </div>
      <template v-if="step === 0">
        <FileDropzone
          accept=".docx"
          title="Перетащите DOCX в мастерскую"
          hint="Только .docx · исходный файл останется без изменений"
          @files="load"
        />
        <div class="row between">
          <small>Файлы обрабатываются на вашем устройстве и не загружаются на сервер.</small
          ><RouterLink to="/templates" class="inline-link"
            >Выбрать сохранённый шаблон <DzhuraIcon name="arrow-right" :size="16"
          /></RouterLink>
        </div>
        <div v-if="template && analysis" class="card stack">
          <div class="row between">
            <strong>{{ template.name }}.docx</strong
            ><span class="badge">{{ (template.source.length / 1024).toFixed(1) }} КБ</span>
          </div>
          <p>Найдено полей: {{ template.fields.length }}</p>
          <div class="row">
            <span v-for="f in template.fields" :key="f.id" class="badge">{{ f.name }}</span>
          </div>
          <Alert v-if="!template.fields.length">
            Поля пока не найдены. На следующем шаге вы сможете отметить нужные места вручную.
          </Alert>
        </div> </template
      ><template v-if="step === 1 && template && analysis">
        <Alert v-for="warning in analysis.warnings" :key="warning">{{ warning }}</Alert
        ><FieldEditor
          :source="template.source"
          :fields="template.fields"
          :paragraphs="analysis.paragraphs"
          @update="fields"
        />
        <details class="card">
          <summary>Сохранить настроенный шаблон</summary>
          <div class="row">
            <label>Название шаблона<input v-model="template.name" maxlength="200" /></label
            ><Button @click="save">Сохранить на устройстве</Button>
          </div>
        </details> </template
      ><template v-if="step === 2 && template">
        <div v-if="genderPair" class="card stack">
          <Checkbox
            :model-value="autoGender"
            label="Определять пол по ФИО"
            @update:model-value="setAutoGender"
          />
          <small
            >Порядок: фамилия, имя, отчество. Пустой пол заполняется по отчеству, затем по фамилии. Значение
            из Excel не меняется; результат можно исправить в таблице.</small
          >
          <small v-if="autoGender && genderReview.inferred"
            >Подставлено: {{ genderReview.inferred }}. Проверьте значения перед созданием.</small
          >
          <Alert v-if="autoGender && genderReview.surname.length"
            >По фамилии определены строки {{ genderReview.surname.slice(0, 8).join(', ')
            }}<template v-if="genderReview.surname.length > 8">
              и ещё {{ genderReview.surname.length - 8 }}</template
            >. Проверьте их.</Alert
          >
          <Alert v-if="autoGender && genderReview.unresolved.length"
            >Не удалось определить пол: строки {{ genderReview.unresolved.slice(0, 8).join(', ')
            }}<template v-if="genderReview.unresolved.length > 8">
              и ещё {{ genderReview.unresolved.length - 8 }}</template
            >. Заполните его вручную.</Alert
          >
        </div>
        <SpreadsheetImport :fields="template.fields" @rows="updateRows" /><Alert
          v-if="!template.fields.length"
        >
          В документе нет полей, поэтому данные не подставятся. Вернитесь к настройке полей, чтобы отметить
          изменяемые места. </Alert
        ><DataEditor :fields="template.fields" :rows="rows" @update="updateRows" /> </template
      ><template v-if="step === 3 && template">
        <Alert v-if="autoGender && genderReview.inferred">
          Пол подставлен автоматически для {{ genderReview.inferred }} строк. Проверьте значения перед
          созданием<template v-if="genderReview.surname.length"
            >; по фамилии определены строки {{ genderReview.surname.slice(0, 8).join(', ')
            }}<template v-if="genderReview.surname.length > 8">
              и ещё {{ genderReview.surname.length - 8 }}</template
            ></template
          >.
        </Alert>
        <div class="card stack output-choice" role="group" aria-label="Формат результата">
          <h3>Формат результата</h3>
          <div class="output-options">
            <button
              type="button"
              :aria-pressed="outputFormat === 'separate'"
              @click="outputFormat = 'separate'"
            >
              <span class="output-title"
                ><strong>Отдельные DOCX</strong
                ><span v-if="outputFormat === 'separate'" class="output-selected" aria-hidden="true"
                  >✓ Выбрано</span
                ></span
              >
              <small>Для нескольких строк — ZIP с файлами</small>
            </button>
            <button
              type="button"
              :aria-pressed="outputFormat === 'combined'"
              @click="outputFormat = 'combined'"
            >
              <span class="output-title"
                ><strong>Один общий DOCX</strong
                ><span v-if="outputFormat === 'combined'" class="output-selected" aria-hidden="true"
                  >✓ Выбрано</span
                ></span
              >
              <small>Каждая строка заполняет шаблон с новой страницы</small>
            </button>
          </div>
          <small v-if="outputFormat === 'combined'"
            >Подходит для одного шаблона без изображений, закладок, сносок, списков и переменных полей в
            колонтитулах. Длинное направление может занять больше одной страницы.</small
          >
        </div>
        <div class="review-stats">
          <div class="card">
            <span class="stat">{{ ready.length }}</span
            ><span>{{ outputFormat === 'combined' ? 'Строк для общего файла' : 'Готово к созданию' }}</span>
          </div>
          <div class="card">
            <span class="stat">{{ problems.length }}</span
            ><span>Требуют внимания</span>
          </div>
        </div>
        <Alert v-if="rows.length >= softDocuments">
          Пачка большая и может обрабатываться дольше обычного. Вы сможете отменить операцию.
        </Alert>
        <details v-if="problems.length" class="card" open>
          <summary>Проблемные строки</summary>
          <p v-for="p in problems" :key="p.index">
            Строка {{ p.index + 1 }}: {{ p.errors.map((e) => `${e.field} — ${e.message}`).join('; ') }}
          </p>
          <Button @click="go(2)">Исправить данные</Button>
        </details>
        <details class="card">
          <summary>
            {{ outputFormat === 'combined' ? 'Исключение строк' : 'Имена файлов и исключение строк' }}
          </summary>
          <div class="stack">
            <template v-if="outputFormat === 'separate'">
              <label
                >Шаблон имени файла<input
                  v-model="template.filename"
                  placeholder="Документ_001 (по умолчанию)"
              /></label>
              <small v-pre>Можно использовать названия полей: Договор_{{ ФИО }}</small>
              <small v-for="name in fileExamples" :key="name">{{ name }}</small>
            </template>
            <div class="exclusions">
              <label v-for="(_, i) in rows" :key="i" class="inline"
                ><input v-model="excluded" type="checkbox" :value="i" />Исключить строку {{ i + 1 }}</label
              >
            </div>
          </div>
        </details>
        <div class="card stack">
          <div class="row between">
            <DzhuraSelect
              label="Предпросмотр строки"
              compact
              :disabled="!rows.length"
              :model-value="previewRow"
              :options="rows.map((_, i) => ({ label: String(i + 1), value: i }))"
              @update:model-value="previewRow = Number($event)"
            />
            <div class="row">
              <Button @click="go(2)">Изменить данные</Button
              ><Button :disabled="!rows.length" @click="showPreview">Показать документ</Button>
            </div>
          </div>
          <DocumentPreview v-if="preview" :bytes="preview" />
          <p v-else class="muted">
            {{
              outputFormat === 'combined'
                ? 'Выберите строку, чтобы увидеть её заполнение в общем файле.'
                : 'Выберите любую строку, чтобы увидеть соответствующий будущий DOCX.'
            }}
          </p>
        </div> </template
      ><template v-if="step === 4 && result">
        <JobResult :result="result" :excluded="rows.length - ready.length" />
        <div class="actions">
          <Button @click="save">Сохранить шаблон</Button
          ><Button @click="go(2)">
            {{ result.errors.length ? 'Исправить ошибки' : 'Создать ещё по этому шаблону' }}
          </Button>
        </div>
      </template>
      <div v-if="step < 4" class="actions">
        <Button v-if="step > 0" @click="go(step - 1)"><DzhuraIcon name="arrow-left" :size="17" />Назад</Button
        ><Button v-if="step < 3" variant="primary" :disabled="!template" @click="go(step + 1)">
          {{ step === 0 ? 'К настройке полей' : step === 1 ? 'К данным' : 'Проверить данные' }}
          <DzhuraIcon name="arrow-right" :size="18" /> </Button
        ><Button v-else variant="primary" :disabled="!ready.length" @click="generate">
          {{ outputFormat === 'combined' ? 'Создать общий DOCX' : `Создать ${documents(ready.length)}` }}
        </Button>
      </div>
    </template>
  </div>
</template>
<style scoped>
.inline-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 600;
  text-decoration: none;
}
.inline-link svg {
  transition: transform var(--motion);
}
.inline-link:hover svg {
  transform: translateX(3px);
}
.review-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.output-choice h3 {
  margin: 0;
}
.output-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
.output-options button {
  display: grid;
  gap: 4px;
  padding: var(--space-4);
  text-align: left;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
}
.output-options button[aria-pressed='true'] {
  border-color: var(--primary);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--primary);
}
.output-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.output-selected {
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.output-options button small {
  color: var(--muted);
}
@media (max-width: 600px) {
  .output-options {
    grid-template-columns: 1fr;
  }
}
.review-stats .card {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}
.stat {
  font-size: 36px;
  color: var(--primary);
  font-weight: 500;
}
.exclusions {
  max-height: 180px;
  overflow: auto;
}
</style>
