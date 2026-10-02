<script setup lang="ts">
import DzhuraSelect from './DzhuraSelect.vue';
defineOptions({ inheritAttrs: false });
defineProps<{ label: string; options: { label: string; value: string }[] }>();
const model = defineModel<string>({ default: '' });
</script>
<template>
  <DzhuraSelect
    :label="label"
    :model-value="model"
    :options="options"
    v-bind="$attrs"
    @update:model-value="model = String($event ?? '')"
  />
</template>
