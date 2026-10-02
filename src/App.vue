<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { repository } from './infrastructure/persistence/db';
import Alert from './shared/ui/Alert.vue';
import DzhuraIcon from './shared/ui/DzhuraIcon.vue';
import DzhuraMark from './shared/ui/DzhuraMark.vue';

const themes = [
  { value: 'terracotta', label: 'Терракота', hint: 'Тёплая мастерская' },
  { value: 'sage', label: 'Шалфей', hint: 'Спокойный ботанический' },
  { value: 'sand', label: 'Песок', hint: 'Светлый золотистый' },
  { value: 'ink', label: 'Чернила', hint: 'Прохладный минеральный' },
];
const palette = ref('terracotta');
const paletteOpen = ref(false);
const paletteRoot = ref<HTMLElement>();
const paletteTrigger = ref<HTMLButtonElement>();
const paletteName = computed(
  () => themes.find((theme) => theme.value === palette.value)?.label || 'Терракота',
);
const error = ref(false);
const fail = () => (error.value = true);
const cacheKey = 'dzhura-palette';
let changed = false;
function cachedPalette() {
  try {
    const value = localStorage.getItem(cacheKey);
    return themes.some((theme) => theme.value === value) ? value : null;
  } catch {
    return null;
  }
}
function cachePalette(value: string) {
  try {
    localStorage.setItem(cacheKey, value);
  } catch {
    // IndexedDB remains the fallback when localStorage is unavailable.
  }
}

async function change(value: string) {
  changed = true;
  palette.value = value;
  paletteOpen.value = false;
  document.documentElement.dataset.palette = value;
  cachePalette(value);
  try {
    await repository.setSetting('palette', value);
  } catch {
    error.value = true;
  }
}
function outside(event: PointerEvent) {
  if (!paletteRoot.value?.contains(event.target as Node)) paletteOpen.value = false;
}
function escape(event: KeyboardEvent) {
  if (event.key === 'Escape' && paletteOpen.value) {
    paletteOpen.value = false;
    paletteTrigger.value?.focus();
  }
}
onMounted(async () => {
  window.addEventListener('dzhura-error', fail);
  document.addEventListener('pointerdown', outside);
  document.addEventListener('keydown', escape);
  const cached = cachedPalette();
  if (cached) {
    palette.value = cached;
    document.documentElement.dataset.palette = cached;
  }
  try {
    const stored = await repository.setting('palette');
    if (!cached && !changed && themes.some((theme) => theme.value === stored)) {
      palette.value = stored!;
      cachePalette(stored!);
    }
    document.documentElement.dataset.palette = palette.value;
  } catch {
    error.value = true;
  }
});
onUnmounted(() => {
  window.removeEventListener('dzhura-error', fail);
  document.removeEventListener('pointerdown', outside);
  document.removeEventListener('keydown', escape);
});
</script>
<template>
  <a class="skip" href="#main">Перейти к содержимому</a>
  <header class="header">
    <div class="header-inner">
      <RouterLink to="/" class="brand" aria-label="ДЖУРА — главная">
        <span class="brand-mark"><DzhuraMark /></span>
        <span class="brand-copy"><strong>ДЖУРА</strong><small>мастерская документов</small></span>
      </RouterLink>
      <nav class="header-actions" aria-label="Инструменты">
        <div ref="paletteRoot" class="palette-wrap">
          <button
            ref="paletteTrigger"
            class="nav-control theme-trigger"
            type="button"
            :aria-label="`Палитра: ${paletteName}`"
            :aria-expanded="paletteOpen"
            aria-controls="palette-popover"
            @click="paletteOpen = !paletteOpen"
          >
            <span class="theme-swatch" :class="palette" aria-hidden="true"></span>
            <span class="theme-copy"
              ><small>Палитра</small><strong>{{ paletteName }}</strong></span
            >
            <DzhuraIcon name="chevron-down" :size="15" class="theme-chevron" />
          </button>
          <div
            v-show="paletteOpen"
            id="palette-popover"
            class="palette-popover"
            role="group"
            aria-label="Выберите палитру"
          >
            <div class="popover-heading">НАСТРОЕНИЕ МАСТЕРСКОЙ</div>
            <button
              v-for="theme in themes"
              :key="theme.value"
              class="palette-option"
              :class="{ selected: palette === theme.value }"
              type="button"
              :aria-pressed="palette === theme.value"
              @click="change(theme.value)"
            >
              <span class="palette-preview" :class="theme.value" aria-hidden="true"><i></i><b></b></span>
              <span class="option-copy"
                ><strong>{{ theme.label }}</strong
                ><small>{{ theme.hint }}</small></span
              >
              <span v-if="palette === theme.value" class="option-check" aria-hidden="true">✓</span>
            </button>
          </div>
        </div>
        <RouterLink class="nav-control guide-link" to="/guide" @click="paletteOpen = false">
          <DzhuraIcon name="guide" :size="19" />
          <span class="guide-full">Как пользоваться</span><span class="guide-short">Гайд</span>
          <DzhuraIcon name="arrow-up-right" :size="15" class="guide-arrow" />
        </RouterLink>
      </nav>
    </div>
  </header>
  <main id="main" class="container">
    <Alert v-if="error" kind="error">
      Не удалось выполнить действие или сохранить настройки. Проверьте доступность хранилища браузера.
      <button class="link-button" @click="error = false">Закрыть</button> </Alert
    ><RouterView />
  </main>
  <footer class="footer">
    <span>ДЖУРА <span aria-hidden="true">·</span> меньше рутины, больше времени</span
    ><span>Локально. Бережно. По делу.</span>
  </footer>
</template>
<style scoped>
.header {
  position: relative;
  z-index: 20;
  padding: 12px var(--space-5) 0;
}
.header-inner {
  max-width: var(--content);
  min-height: 76px;
  margin: auto;
  padding: 10px 14px 10px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-5);
  border: 1px solid #ffffff1b;
  border-radius: 18px;
  background: linear-gradient(
    105deg,
    var(--espresso),
    color-mix(in srgb, var(--espresso) 89%, var(--primary))
  );
  box-shadow:
    0 2px 5px #1e171423,
    0 16px 32px #1e171426,
    inset 0 1px 0 #ffffff23;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: #fffaf4;
  text-decoration: none;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border: 1px solid #ffffff40;
  border-radius: 14px;
  color: #fffdf8;
  background: linear-gradient(145deg, #b46d4e, var(--clay));
  box-shadow:
    0 4px 8px #100c0b30,
    inset 0 1px 0 #ffffff66;
  transform: rotate(-3deg);
  transition: transform 180ms ease;
}
.brand:hover .brand-mark {
  transform: rotate(0deg) translateY(-1px);
}
.brand-mark svg {
  width: 36px;
  height: 36px;
}
.brand-copy {
  display: grid;
  line-height: 1.12;
}
.brand-copy strong {
  font-size: 24px;
  font-weight: 750;
  letter-spacing: 0.2px;
}
.brand-copy small {
  color: #e7d9cd;
  font-size: 10px;
  letter-spacing: 0.3px;
  white-space: nowrap;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.palette-wrap {
  position: relative;
}
.nav-control {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  border: 1px solid #ffffff2b;
  border-radius: 12px;
  padding: 8px 13px;
  color: #fffaf4;
  background: #ffffff11;
  box-shadow: inset 0 1px 0 #ffffff17;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background var(--motion),
    transform var(--motion),
    border-color var(--motion);
}
.nav-control:hover,
.nav-control[aria-expanded='true'] {
  background: #ffffff24;
  border-color: #ffffff5a;
  transform: translateY(-1px);
}
.nav-control:active {
  transform: translateY(1px);
}
.theme-trigger {
  min-width: 158px;
  text-align: left;
}
.theme-swatch {
  display: block;
  width: 23px;
  height: 23px;
  flex: 0 0 23px;
  border: 2px solid #fff9;
  border-radius: 8px;
  box-shadow: 0 2px 5px #0004;
}
.theme-swatch.terracotta {
  background: #b4664a;
}
.theme-swatch.sage {
  background: #779a7b;
}
.theme-swatch.sand {
  background: #d3ae66;
}
.theme-swatch.ink {
  background: #68899c;
}
.theme-copy {
  display: grid;
  line-height: 1.2;
}
.theme-copy small {
  color: #e4d9d0;
  font-size: 10px;
}
.theme-copy strong {
  font-size: 13px;
  font-weight: 600;
}
.theme-chevron {
  margin-left: auto;
  transition: transform var(--motion);
}
[aria-expanded='true'] .theme-chevron {
  transform: rotate(180deg);
}
.guide-link {
  font-size: 13px;
  font-weight: 600;
}
.guide-arrow {
  opacity: 0.75;
  transition: transform var(--motion);
}
.guide-link:hover .guide-arrow {
  transform: translate(2px, -2px);
}
.guide-short {
  display: none;
}
.palette-popover {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 30;
  width: 300px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-elevated);
  box-shadow:
    var(--shadow-raised),
    inset 0 1px 0 #fff;
  animation: pop-in 170ms ease-out both;
}
.popover-heading {
  padding: 7px 10px 10px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
}
.palette-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 58px;
  border: 1px solid transparent;
  border-radius: 11px;
  padding: 8px;
  color: var(--text);
  background: transparent;
  text-align: left;
}
.palette-option:hover,
.palette-option.selected {
  background: var(--surface);
  border-color: var(--border);
}
.palette-option:hover {
  transform: translateY(-1px);
}
.palette-preview {
  position: relative;
  display: block;
  width: 49px;
  height: 38px;
  flex: 0 0 49px;
  overflow: hidden;
  border: 1px solid #0002;
  border-radius: 8px;
  box-shadow: 0 2px 5px #0002;
}
.palette-preview i,
.palette-preview b {
  position: absolute;
  display: block;
  border-radius: 3px;
}
.palette-preview i {
  inset: 6px 18px 6px 5px;
  background: #fffcf8;
  box-shadow: 0 2px 3px #0002;
}
.palette-preview b {
  right: 5px;
  top: 7px;
  bottom: 7px;
  width: 9px;
}
.palette-preview.terracotta {
  background: #eee8df;
}
.palette-preview.terracotta b {
  background: #925039;
}
.palette-preview.sage {
  background: #e8ede5;
}
.palette-preview.sage b {
  background: #3e6048;
}
.palette-preview.sand {
  background: #f0e8d9;
}
.palette-preview.sand b {
  background: #a88345;
}
.palette-preview.ink {
  background: #e5e9ed;
}
.palette-preview.ink b {
  background: #31566c;
}
.option-copy {
  display: grid;
  line-height: 1.25;
}
.option-copy strong {
  font-size: 14px;
}
.option-copy small {
  color: var(--muted);
  font-size: 11px;
}
.option-check {
  margin-left: auto;
  color: var(--primary);
  font-weight: 700;
}
.footer {
  max-width: var(--content);
  margin: var(--space-7) auto 0;
  padding: var(--space-5);
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  color: var(--muted);
  font-size: 12px;
}
.skip {
  position: absolute;
  top: -100px;
  z-index: 100;
  background: var(--surface-elevated);
  padding: var(--space-3);
}
.skip:focus {
  top: 0;
}
@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@media (max-width: 650px) {
  .header {
    padding: 9px 10px 0;
  }
  .header-inner {
    min-height: 62px;
    padding: 8px;
    gap: 6px;
    border-radius: 14px;
  }
  .brand {
    gap: 7px;
  }
  .brand-mark {
    width: 37px;
    height: 37px;
    flex-basis: 37px;
    border-radius: 10px;
  }
  .brand-mark svg {
    width: 29px;
    height: 29px;
  }
  .brand-copy strong {
    font-size: 18px;
  }
  .brand-copy small {
    display: none;
  }
  .header-actions {
    gap: 5px;
  }
  .nav-control {
    min-height: 40px;
    padding: 7px;
    gap: 6px;
  }
  .theme-trigger {
    min-width: 0;
  }
  .theme-copy small {
    display: none;
  }
  .theme-copy strong {
    font-size: 12px;
  }
  .theme-chevron {
    width: 12px;
  }
  .guide-full,
  .guide-arrow {
    display: none;
  }
  .guide-short {
    display: inline;
  }
  .guide-link {
    font-size: 12px;
  }
  .guide-link svg {
    width: 16px;
  }
  .footer {
    flex-direction: column;
  }
}
@media (max-width: 390px) {
  .theme-copy {
    display: none;
  }
  .palette-popover {
    position: fixed;
    top: 74px;
    left: 10px;
    right: 10px;
    width: auto;
  }
}
</style>
