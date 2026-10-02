<script setup lang="ts">
import DzhuraIcon from '../shared/ui/DzhuraIcon.vue';
</script>
<template>
  <section class="empty">
    <p class="eyebrow">404</p>
    <h1>Здесь пока нет документа</h1>
    <p>Возможно, адрес изменился. Вернитесь в мастерскую.</p>
    <RouterLink to="/" class="back-link">На главную <DzhuraIcon name="arrow-right" :size="17" /></RouterLink>
  </section>
</template>
