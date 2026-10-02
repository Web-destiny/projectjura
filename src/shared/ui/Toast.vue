<script setup lang="ts">
import Alert from './Alert.vue';
import IconButton from './IconButton.vue';
defineProps<{ message: string; kind?: 'info' | 'success' | 'error' }>();
defineEmits<{ close: [] }>();
</script>
<template>
  <div class="toast">
    <Alert :kind="kind"
      ><div class="row between">
        <span>{{ message }}</span
        ><IconButton label="Закрыть уведомление" @click="$emit('close')">×</IconButton>
      </div></Alert
    >
  </div>
</template>
