<script setup lang="ts">
import Button from './Button.vue';
defineProps<{ label: string; disabled?: boolean; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }>();
</script>
<template>
  <Button :aria-label="label" :title="label" :variant="variant || 'ghost'" :disabled="disabled"
    ><span aria-hidden="true"><slot /></span
  ></Button>
</template>
