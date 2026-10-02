<script setup lang="ts">
import Modal from './Modal.vue';
defineProps<{ title: string }>();
const open = defineModel<boolean>({ default: false });
</script>
<template>
  <Modal v-model="open" :title="title" class="drawer"><slot /></Modal>
</template>
<style scoped>
.drawer {
  margin: 0 0 0 auto;
  height: 100dvh;
  max-height: 100dvh;
  border-radius: var(--radius) 0 0 var(--radius);
}
</style>
