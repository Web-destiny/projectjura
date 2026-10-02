<script setup lang="ts">
import TemplateLibrary from '../features/TemplateLibrary.vue';
import DzhuraIcon from '../shared/ui/DzhuraIcon.vue';
</script>
<template>
  <section class="home-hero">
    <div>
      <p class="eyebrow">ВАША МАСТЕРСКАЯ ДОКУМЕНТОВ</p>
      <h1>Документы<br />без <span>рутины.</span></h1>
      <p class="intro">
        Создавайте документы по шаблону<br />и изменяйте готовые DOCX. Один или сразу сотни.
      </p>
      <div class="privacy"><DzhuraIcon name="document" :size="16" /> Файлы остаются на вашем устройстве</div>
    </div>
    <div class="desk" aria-hidden="true">
      <div class="sheet sheet-back"></div>
      <div class="sheet sheet-middle"></div>
      <div class="sheet sheet-front">
        <div class="sheet-top"><span>ДОГОВОР</span><span>№ 001</span></div>
        <div class="paper-lines"><i></i><i></i><i class="short"></i></div>
        <span v-pre class="paper-field">{{ ФИО }}</span>
        <div class="paper-lines"><i></i><i></i><i class="short"></i></div>
        <div class="paper-bottom">
          <span v-pre>{{ Дата }}</span
          ><span class="signature">Джура</span>
        </div>
      </div>
      <span class="done-note">✓ Готово к работе</span><span class="desk-dot dot-one"></span
      ><span class="desk-dot dot-two"></span>
    </div>
  </section>
  <section class="scenarios" aria-label="Выберите действие">
    <RouterLink to="/create" class="scenario create">
      <div class="scenario-top">
        <span class="scenario-icon" aria-hidden="true"><DzhuraIcon name="document" :size="26" /></span
        ><span class="scenario-number">01 / СОЗДАНИЕ</span
        ><span class="arrow" aria-hidden="true"><DzhuraIcon name="arrow-up-right" :size="21" /></span>
      </div>
      <h2>Создать документ</h2>
      <p>Один шаблон — сколько угодно документов.<br />Заполните данные вручную или загрузите Excel.</p>
      <div class="scenario-bottom">
        <span>Начать с шаблона</span><DzhuraIcon name="arrow-right" :size="18" />
      </div> </RouterLink
    ><RouterLink to="/edit" class="scenario edit">
      <div class="scenario-top">
        <span class="scenario-icon" aria-hidden="true"><DzhuraIcon name="replace" :size="26" /></span
        ><span class="scenario-number">02 / ИЗМЕНЕНИЕ</span
        ><span class="arrow" aria-hidden="true"><DzhuraIcon name="arrow-up-right" :size="21" /></span>
      </div>
      <h2>Изменить документ</h2>
      <p>Обновите текст в готовых документах.<br />Найдите и замените сразу во всей пачке.</p>
      <div class="scenario-bottom">
        <span>Выбрать документы</span><DzhuraIcon name="arrow-right" :size="18" />
      </div>
    </RouterLink>
  </section>
  <div class="local-note">
    <span class="status-dot" aria-hidden="true"></span
    ><span>Без регистрации и загрузки на сервер. Исходные файлы остаются нетронутыми.</span
    ><span class="formats">DOCX · XLSX · CSV · ZIP</span>
  </div>
  <TemplateLibrary compact />
  <aside class="help-strip">
    <div>
      <span class="eyebrow">ПЕРВЫЙ РАЗ ЗДЕСЬ?</span>
      <p>От первого поля до готовой пачки — всё по шагам.</p>
    </div>
    <RouterLink to="/guide">Открыть гайд <DzhuraIcon name="arrow-up-right" :size="17" /></RouterLink>
  </aside>
</template>
<style scoped>
.home-hero {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  align-items: center;
  min-height: 370px;
  padding: var(--space-6) var(--space-5) var(--space-7);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(
      ellipse 42% 62% at 78% 48%,
      color-mix(in srgb, var(--clay) 10%, transparent),
      transparent 95%
    ),
    radial-gradient(
      ellipse 35% 48% at 18% 20%,
      color-mix(in srgb, var(--deep-sage) 5%, transparent),
      transparent 100%
    );
}
h1 {
  font-size: clamp(44px, 4.6vw, 58px);
  font-weight: 650;
  line-height: 1.08;
  letter-spacing: -2.1px;
  margin-bottom: var(--space-5);
}
h1 span {
  color: var(--primary);
}
.intro {
  font-size: 17px;
  color: var(--muted);
  line-height: 1.8;
}
.privacy {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--secondary);
  font-size: 13px;
  font-weight: 600;
}
.desk {
  height: 290px;
  position: relative;
  max-width: 420px;
  width: 100%;
  justify-self: end;
}
.sheet {
  position: absolute;
  width: 222px;
  height: 267px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-elevated);
  box-shadow: var(--shadow-raised);
  left: 90px;
  top: 0;
}
.sheet-back {
  transform: rotate(13deg);
  background: var(--surface-alt);
}
.sheet-middle {
  transform: rotate(-8deg);
  left: 66px;
  top: 5px;
}
.sheet-front {
  padding: var(--space-5);
  transform: rotate(3deg);
}
.sheet-top {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: var(--muted);
  letter-spacing: 1px;
}
.paper-lines {
  display: grid;
  gap: var(--space-2);
  margin: var(--space-5) 0;
}
.paper-lines i {
  height: 4px;
  border-radius: 2px;
  background: var(--surface-alt);
  width: 100%;
}
.paper-lines .short {
  width: 70%;
}
.paper-field {
  background: var(--accent-soft);
  border-radius: 4px;
  color: var(--primary);
  padding: 6px 12px;
  font-size: 12px;
}
.paper-bottom {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--muted);
}
.signature {
  font-family: Georgia, serif;
  font-size: 19px;
  font-style: italic;
  color: var(--primary);
}
.done-note {
  position: absolute;
  left: 211px;
  top: 224px;
  transform: rotate(-5deg);
  background: var(--secondary);
  color: var(--surface);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  font-size: 12px;
  box-shadow: var(--shadow-raised);
  white-space: nowrap;
}
.desk-dot {
  position: absolute;
  border-radius: 50%;
  background: var(--accent-soft);
  width: 10px;
  height: 10px;
}
.dot-one {
  top: 34px;
  right: 19px;
}
.dot-two {
  bottom: 14px;
  left: 24px;
  width: 6px;
  height: 6px;
}
.scenarios {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
}
.scenario {
  --scenario-accent: var(--clay);
  --scenario-tint: var(--clay-soft);
  display: block;
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  text-decoration: none;
  color: var(--text);
  background: linear-gradient(
    145deg,
    var(--surface-elevated),
    color-mix(in srgb, var(--scenario-tint) 42%, var(--surface)) 145%
  );
  box-shadow:
    var(--shadow),
    inset 0 1px 0 #ffffffd6;
  transition:
    transform var(--motion),
    box-shadow var(--motion),
    border-color var(--motion);
}
.scenario.edit {
  --scenario-accent: var(--deep-sage);
  --scenario-tint: var(--sage-soft);
}
.scenario:hover {
  transform: translateY(-5px);
  border-color: var(--border-strong);
  box-shadow:
    var(--shadow-raised),
    inset 0 1px 0 #ffffffee;
}
.scenario:active {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
.scenario-top {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.scenario-icon {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--scenario-accent) 82%, white),
    var(--scenario-accent)
  );
  color: #fff;
  border-radius: 14px;
  box-shadow:
    0 6px 12px color-mix(in srgb, var(--scenario-accent) 25%, transparent),
    inset 0 1px 0 #ffffff66;
}
.edit .scenario-icon {
  color: #fff;
}
.scenario-number {
  font-size: 10px;
  letter-spacing: 1.5px;
  color: var(--muted);
}
.arrow {
  margin-left: auto;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  color: var(--scenario-accent);
  background: var(--scenario-tint);
  transition: transform var(--motion);
}
.scenario:hover .arrow {
  transform: translate(2px, -2px);
}
.scenario h2 {
  font-size: 27px;
  font-weight: 650;
  margin-bottom: var(--space-3);
}
.scenario p {
  font-size: 15px;
  color: var(--muted);
  line-height: 1.8;
}
.scenario-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  margin-top: var(--space-5);
  border-radius: 11px;
  background: color-mix(in srgb, var(--scenario-tint) 75%, var(--surface-elevated));
  font-size: 14px;
  font-weight: 650;
  color: var(--scenario-accent);
}
.scenario-bottom svg {
  transition: transform var(--motion);
}
.scenario:hover .scenario-bottom svg {
  transform: translateX(4px);
}
.scenario:active .scenario-bottom svg {
  transform: translateX(1px);
}
.edit .scenario-bottom {
  color: var(--scenario-accent);
}
.local-note {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 12px;
  color: var(--muted);
  margin: var(--space-5) var(--space-2) var(--space-7);
}
.status-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: var(--deep-sage);
  box-shadow: 0 0 0 3px var(--sage-soft);
}
.formats {
  margin-left: auto;
  white-space: nowrap;
  letter-spacing: 1px;
}
.help-strip {
  margin-top: var(--space-6);
  padding: var(--space-5) var(--space-6);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(
    115deg,
    var(--espresso),
    color-mix(in srgb, var(--espresso) 82%, var(--deep-sage))
  );
  box-shadow:
    var(--shadow-raised),
    inset 0 1px 0 #ffffff25;
  border-radius: var(--radius);
  color: #fffaf4;
}
.help-strip .eyebrow {
  color: #e5c6ad;
}
.help-strip p {
  font-size: 14px;
  color: #f2e8dd;
  margin: var(--space-2) 0 0;
}
.help-strip a {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 10px 14px;
  border: 1px solid #ffffff45;
  border-radius: 10px;
  background: #ffffff16;
  color: #fffaf4;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.help-strip a:hover {
  background: #ffffff28;
  transform: translateY(-1px);
}
@media (max-width: 750px) {
  .home-hero {
    grid-template-columns: 1fr;
    padding-top: var(--space-4);
  }
  .desk {
    display: none;
  }
  .scenarios {
    grid-template-columns: 1fr;
  }
  .local-note {
    flex-wrap: wrap;
  }
  .formats {
    margin-left: 0;
  }
  .help-strip {
    gap: var(--space-4);
    align-items: start;
    flex-direction: column;
  }
}
</style>
