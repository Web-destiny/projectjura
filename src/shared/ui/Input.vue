<script setup lang="ts">
import { useId } from 'vue';
defineOptions({ inheritAttrs: false });
defineProps<{ label: string; error?: string }>();
const model = defineModel<string>({ default: '' });
const id = useId();
</script>
<template>
  <label :for="id"
    >{{ label
    }}<input
      :id="id"
      v-model="model"
      v-bind="$attrs"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${id}-error` : undefined"
    /><span v-if="error" :id="`${id}-error`" class="error-text">{{ error }}</span></label
  >
</template>
