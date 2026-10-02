<script setup lang="ts">
import { ref } from 'vue';
import DzhuraIcon from '../shared/ui/DzhuraIcon.vue';
const example = ref('Иванов Иван Иванович');
</script>
<template>
  <RouterLink to="/" class="back-link"><DzhuraIcon name="arrow-left" :size="17" />В мастерскую</RouterLink>
  <div class="heading">
    <p class="eyebrow">ПОНЯТНО, ПО ШАГАМ</p>
    <h1>Как пользоваться ДЖУРОЙ</h1>
    <p>От первого шаблона до сотен готовых документов.</p>
  </div>
  <div class="guide-layout">
    <nav class="card stack" aria-label="Разделы гайда">
      <a href="#create">Создание документов</a><a href="#fields">Настройка полей</a
      ><a href="#data">Данные и Excel</a><a href="#review">Проверка и результат</a
      ><a href="#edit">Изменение документов</a><a href="#templates">Шаблоны и перенос</a
      ><a href="#privacy">Безопасность и хранение</a><a href="#faq">Вопросы и ответы</a>
    </nav>
    <article class="stack">
      <section id="create" class="card">
        <span class="eyebrow">01 / НАЧАЛО</span>
        <h2>Создание документов</h2>
        <p>
          Подготовьте документ в Word: договор, заявление, справку или письмо. Оформите шрифты, таблицы и
          колонтитулы так, как они должны выглядеть в результате. Сохраните в формате <strong>.docx</strong>.
        </p>
        <ol class="check-list">
          <li>На главной нажмите «Создать документ».</li>
          <li>Перетащите DOCX в область загрузки или выберите его на компьютере.</li>
          <li>Проверьте имя и список найденных полей. Если полей пока нет — это нормально.</li>
          <li>Нажмите «К настройке полей».</li>
        </ol>
        <p>
          DOC, DOCM, PDF и защищённые паролем документы не поддерживаются. Для старого DOC используйте
          «Сохранить как → Документ Word (.docx)» в Word.
        </p>
      </section>
      <section id="fields" class="card">
        <span class="eyebrow">02 / ШАБЛОН</span>
        <h2>Что будет меняться</h2>
        <details open>
          <summary>Способ 1. Плейсхолдеры в Word</summary>
          <p>
            Напишите названия изменяемых значений в двойных фигурных скобках: <code v-pre>{{ ФИО }}</code
            >, <code v-pre>{{ Дата }}</code
            >, <code v-pre>{{ Сумма }}</code
            >. Одинаковые названия объединяются в одно поле: введённое значение появится во всех вхождениях.
          </p>
          <p>
            Word может разбить плейсхолдер на несколько внутренних фрагментов. ДЖУРА собирает текст абзаца и
            распознаёт такое поле.
          </p>
        </details>
        <details>
          <summary>Способ 2. Выделение существующего текста</summary>
          <p>
            Откройте «Разметка полей», выделите мышью нужные слова в одном абзаце или одной ячейке таблицы. В
            правой панели укажите название и нажмите «Сделать полем». Исходный текст останется видимым с
            подсветкой.
          </p>
          <p>
            Если похожий текст встречается ещё, ДЖУРА предложит добавить остальные вхождения. Они не
            добавляются автоматически. Поля не могут пересекаться, включать табуляцию или переходить через
            границу абзаца.
          </p>
          <p>
            Вкладка «Вид документа» показывает страницы. Разметка полей использует точный текстовый индекс
            исходного DOCX, чтобы одинаковые слова в разных местах не путались.
          </p>
        </details>
        <details>
          <summary>Тип, обязательность и формат</summary>
          <p>
            Выберите поле справа. Тип «Текст» подходит для ФИО, адресов, ИНН, телефонов и номеров договоров.
            Так сохраняются ведущие нули. «Многострочный текст» позволяет вставлять переносы.
          </p>
          <p>
            «Дата» предлагает календарь и форматы 31.12.2026, 2026-12-31 или длинную запись. «Число» — запись
            без разделителей, с группировкой или с двумя знаками после запятой. Поля необязательны по
            умолчанию; пустое необязательное значение удаляет исходный текст поля.
          </p>
          <p>
            Когда поле пересекает несколько фрагментов с разным стилем, новое значение получает оформление
            начала поля. Остальной документ сохраняется.
          </p>
        </details>
        <div class="example">
          <label>Попробуйте подстановку<input v-model="example" aria-label="Пример ФИО" /></label>
          <div class="mini-flow" aria-label="Пример замены поля в документе">
            <div class="mini-sheet">
              <span class="mini-caption">ШАБЛОН WORD</span>
              <p>Заявление</p>
              <p>
                От: <mark v-pre>{{ ФИО }}</mark>
              </p>
              <span class="mini-line"></span><span class="mini-line short"></span>
            </div>
            <span class="flow-arrow" aria-hidden="true"><DzhuraIcon name="arrow-right" :size="22" /></span>
            <div class="mini-sheet finished">
              <span class="mini-caption">ГОТОВЫЙ DOCX</span>
              <p>Заявление</p>
              <p>
                От: <strong>{{ example || 'пустое значение' }}</strong>
              </p>
              <span class="mini-line"></span><span class="mini-line short"></span>
            </div>
          </div>
        </div>
      </section>
      <section id="data" class="card">
        <span class="eyebrow">03 / ДАННЫЕ</span>
        <h2>Одна таблица для любой пачки</h2>
        <p>
          Одна строка — один будущий DOCX. Для единственного документа заполните первую строку. Для нескольких
          используйте «Добавить строку», дублирование или импорт.
        </p>
        <div class="mini-data" aria-label="Две строки данных создают два документа">
          <div class="mini-data-table">
            <span class="mini-data-head">№</span><span class="mini-data-head">ФИО</span
            ><span class="mini-data-head">Дата</span> <span>1</span><strong>Иванов Иван</strong
            ><span>01.10.2026</span> <span>2</span><strong>Петрова Анна</strong><span>02.10.2026</span>
          </div>
          <span class="mini-output"><DzhuraIcon name="arrow-right" :size="17" /> 2 документа DOCX</span>
        </div>
        <details open>
          <summary>Ручной ввод и вставка из Excel</summary>
          <p>
            Нажмите на ячейку и введите значение. Tab перемещает вправо, стрелки вверх и вниз — между
            строками. Можно скопировать прямоугольный диапазон из Excel и вставить Ctrl+V в первую нужную
            ячейку: значения распределятся по колонкам.
          </p>
          <p>
            Удалить строку можно крестиком справа, дублировать — соседней кнопкой. Большие таблицы показывают
            видимый участок строк для экономии памяти.
          </p>
        </details>
        <details>
          <summary>Импорт XLSX и CSV</summary>
          <p>
            В первой строке файла должны быть названия колонок. Например: «ФИО», «Дата», «Сумма». Остальные
            строки — данные. Избегайте объединённых ячеек и сложных заголовков.
          </p>
          <p>
            Нажмите «Импортировать XLSX / CSV». Однозначные колонки сопоставятся автоматически. Если есть
            несколько листов или неясные соответствия, выберите лист и колонки. После импорта данные попадут в
            тот же редактор. Импорт заменяет текущие строки.
          </p>
          <p>
            CSV должен быть в UTF-8, даты — ГГГГ-ММ-ДД. Для XLSX календарные ячейки преобразуются в дату.
            Идентификаторы с ведущими нулями храните в Excel как текст. Формулы должны иметь сохранённый
            результат: пересчитайте и сохраните книгу перед импортом.
          </p>
        </details>
      </section>
      <section id="review" class="card">
        <span class="eyebrow">04 / РЕЗУЛЬТАТ</span>
        <h2>Проверить и скачать</h2>
        <p>
          На шаге «Проверка» видно, сколько строк готово и какие требуют исправления. Ошибки не блокируют всю
          пачку: можно создать только корректные документы. В дополнительных настройках можно исключить строки
          вручную.
        </p>
        <p>
          Выберите любую строку и нажмите «Показать документ». Предпросмотр создаётся из того же DOCX, который
          будет скачан. Для исправлений вернитесь к данным. Браузер не является Word: переносы строк и страниц
          могут немного отличаться, поэтому проверяйте готовый документ перед отправкой.
        </p>
        <details>
          <summary>Имена файлов</summary>
          <p>
            Без настройки получатся Документ_001.docx, Документ_002.docx и так далее. Можно задать
            <code v-pre>Договор_{{ ФИО }}</code
            >. Запрещённые символы заменяются, одинаковые имена получают суффиксы _2, _3.
          </p>
        </details>
        <p>
          Нажмите «Создать». Прогресс покажет обработанные строки и упаковку архива. «Отменить» останавливает
          обработку; оригиналы не меняются. После завершения нажмите «Скачать DOCX» для одного файла или
          «Скачать ZIP» для нескольких. Автоматического скачивания нет.
        </p>
        <p>
          Если часть файлов не создана, скачайте CSV-отчёт. Исправьте проблемные строки и повторите создание.
          Успешные результаты доступны сразу.
        </p>
      </section>
      <section id="edit" class="card">
        <h2>Изменение готовых документов</h2>
        <details open>
          <summary>Найти и заменить</summary>
          <p>
            Загрузите один или несколько DOCX, либо ZIP, содержащий только DOCX. Введите искомый текст и
            замену. Пустая замена удаляет найденный текст.
          </p>
          <p>
            Нажмите «Найти совпадения». ДЖУРА покажет количество совпадений и документов. В дополнительных
            параметрах включается учёт регистра, поиск целого слова или фразы, обработка основного текста,
            таблиц и колонтитулов.
          </p>
          <p>
            После проверки примените замены и скачайте новые копии. Для текста со сложными Word-конструкциями
            документ может быть пропущен с объяснением в отчёте.
          </p>
        </details>
        <details>
          <summary>Однотипные документы</summary>
          <p>
            Используйте этот режим, когда у файлов одинаковые явные плейсхолдеры. Появится таблица «Файл |
            Поля». Заполните строку для каждого файла или импортируйте таблицу с таким же количеством строк.
          </p>
          <p>
            Соответствие — по порядку файлов в списке. Проверьте его перед запуском. Расположение обычного
            текста по эталонному файлу не угадывается. Для готовых документов без плейсхолдеров нужен поиск и
            замена.
          </p>
        </details>
      </section>
      <section id="templates" class="card">
        <h2>Шаблоны, перенос и резервная копия</h2>
        <p>
          На шаге полей раскройте «Сохранить настроенный шаблон», задайте название и сохраните. В шаблоне
          остаются исходный DOCX, поля, их типы, обязательность, форматы и настройки имён файлов.
        </p>
        <p>
          На главной в «Мои шаблоны» нажмите «Заполнить данные». Повторно размечать поля не потребуется.
          Кнопка «Экспорт» скачивает переносимый файл .dzhura. Его можно хранить отдельно, перенести на другой
          компьютер или отправить коллеге самостоятельно.
        </p>
        <p>
          Для восстановления выберите «Импорт .dzhura». Формат проверяется перед сохранением. Удаление шаблона
          требует подтверждения и затрагивает только это устройство.
        </p>
      </section>
      <section id="privacy" class="card">
        <h2>Где находятся мои документы</h2>
        <p>
          Все операции с документами выполняются в браузере на вашем устройстве. Пользовательские файлы не
          отправляются на сервер, в аналитику, журналы ошибок или сторонние API. Исходные файлы никогда не
          перезаписываются.
        </p>
        <p>
          Шаблоны и один активный черновик хранятся в IndexedDB этого браузера. Черновик обновляется после
          изменений, а при возвращении предлагается продолжить работу. Черновик старше 30 дней удаляется при
          следующем открытии. Результаты генерации в базе не накапливаются.
        </p>
        <p>
          Очистка данных сайта, приватный режим или нехватка места могут удалить локальные данные.
          Экспортируйте важные шаблоны и скачивайте результаты. .dzhura содержит оригинальный документ —
          учитывайте это, когда передаёте его другому человеку.
        </p>
      </section>
      <section id="faq" class="card">
        <h2>Частые вопросы</h2>
        <details>
          <summary>Почему часть текста нельзя изменить?</summary>
          <p>
            Исправления Word, автоматические поля, текстовые блоки, вложенные объекты и некоторые сложные
            абзацы защищены. Примите исправления, преобразуйте автоматическое поле в обычный текст или
            перенесите нужный фрагмент в обычный абзац, затем загрузите новую копию. Сноски сохраняются без
            изменений.
          </p>
        </details>
        <details>
          <summary>Почему документ не открывается?</summary>
          <p>
            Проверьте, что это настоящий DOCX, а не переименованный DOC/PDF. Откройте его в Word и сохраните
            новую копию без пароля. Для повреждённого или подозрительно большого архива ДЖУРА покажет понятную
            ошибку.
          </p>
        </details>
        <details>
          <summary>Можно работать с телефона?</summary>
          <p>
            Главная и гайд доступны на мобильном. Для таблиц и точной разметки документов удобнее компьютер с
            клавиатурой и мышью.
          </p>
        </details>
        <details>
          <summary>Можно ли обработать 500 документов?</summary>
          <p>
            Да, пачки обрабатываются последовательно в отдельном потоке. Скорость и доступный объём зависят от
            устройства, изображений и сложности DOCX. Для крупных файлов делите работу на несколько пачек.
            Можно отменить операцию в любой момент.
          </p>
        </details>
        <details>
          <summary>Будет ли работа доступна без интернета?</summary>
          <p>
            Обработка уже открытой страницы не требует сервера. Однако первое открытие, обновление страницы и
            загрузка ещё не открытых разделов требуют доступа к сайту. Автономная установка с кэшированием
            всего приложения в этой версии не реализована.
          </p>
        </details>
      </section>
    </article>
  </div>
</template>
<style scoped>
.guide-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: var(--space-5);
  align-items: start;
}
.guide-layout nav {
  position: sticky;
  top: var(--space-5);
  border-color: #ffffff22;
  background: linear-gradient(
    155deg,
    var(--espresso),
    color-mix(in srgb, var(--espresso) 85%, var(--deep-sage))
  );
  box-shadow:
    var(--shadow-raised),
    inset 0 1px 0 #ffffff2b;
  gap: 3px;
}
nav a {
  font-size: 14px;
  text-decoration: none;
  color: #f9f3ea;
  padding: 8px 10px;
  border-radius: 9px;
  transition:
    background var(--motion),
    transform var(--motion);
}
nav a:hover {
  color: #fff;
  background: #ffffff23;
  transform: translateX(2px);
}
article section {
  scroll-margin-top: var(--space-5);
}
article section.card {
  box-shadow:
    var(--shadow),
    inset 0 1px 0 #fff;
}
article p {
  font-size: 15px;
  color: var(--muted);
}
article h2 {
  margin-top: var(--space-3);
  font-size: 27px;
  letter-spacing: -0.5px;
}
details {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 13px 15px;
  margin-bottom: 8px;
  background: var(--surface);
  transition:
    background var(--motion),
    box-shadow var(--motion),
    border-color var(--motion);
}
details[open] {
  background: var(--surface-elevated);
  border-color: var(--border-strong);
  box-shadow:
    0 4px 12px #39291d0d,
    inset 0 1px 0 #fff;
}
details summary:hover {
  color: var(--primary);
}
.example {
  padding: var(--space-4);
  background: linear-gradient(
    145deg,
    var(--surface-alt),
    color-mix(in srgb, var(--accent-soft) 24%, var(--surface))
  );
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.mini-flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
.mini-sheet {
  min-height: 140px;
  padding: var(--space-4);
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
}
.mini-sheet p {
  margin: var(--space-2) 0;
  color: var(--text);
}
.mini-sheet mark {
  background: var(--accent-soft);
  color: var(--primary);
  padding: 1px 3px;
}
.mini-caption {
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}
.mini-line {
  display: block;
  height: 4px;
  width: 85%;
  margin-top: 10px;
  border-radius: 99px;
  background: var(--surface-alt);
}
.mini-line.short {
  width: 60%;
}
.flow-arrow {
  color: var(--primary);
  font-size: 22px;
  font-weight: 700;
}
.mini-data {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  background: linear-gradient(
    145deg,
    var(--surface-alt),
    color-mix(in srgb, var(--sage-soft) 30%, var(--surface))
  );
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.mini-data-table {
  display: grid;
  grid-template-columns: 30px minmax(100px, 1fr) minmax(96px, auto);
  gap: 1px;
  width: min(100%, 430px);
  border: 1px solid var(--border);
  background: var(--border);
  font-size: 13px;
}
.mini-data-table > * {
  background: var(--surface-elevated);
  padding: 7px 9px;
}
.mini-data-table .mini-data-head {
  background: var(--surface);
  color: var(--muted);
  font-weight: 700;
}
.mini-output {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--primary);
  font-weight: 700;
}
@media (max-width: 580px) {
  .mini-flow {
    grid-template-columns: 1fr;
  }
  .flow-arrow {
    transform: rotate(90deg);
    justify-self: center;
  }
}
@media (max-width: 800px) {
  .guide-layout {
    grid-template-columns: 1fr;
  }
  .guide-layout nav {
    position: static;
  }
}
</style>
