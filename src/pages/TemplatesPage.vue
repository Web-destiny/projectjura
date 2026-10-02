<script setup lang="ts">
import TemplateLibrary from '../features/TemplateLibrary.vue';
import DzhuraIcon from '../shared/ui/DzhuraIcon.vue';
</script>
<template>
  <RouterLink to="/" class="back-link"><DzhuraIcon name="arrow-left" :size="17" />В мастерскую</RouterLink>
  <div class="heading">
    <h1>Ваши рабочие заготовки</h1>
    <p>Настройте один раз, используйте снова и снова.</p>
  </div>
  <TemplateLibrary />
</template>
