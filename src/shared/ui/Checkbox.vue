<script setup lang="ts">
defineOptions({ inheritAttrs: false });
defineProps<{ label: string }>();
const model = defineModel<boolean>({ default: false });
</script>
<template>
  <label class="inline"><input v-model="model" type="checkbox" v-bind="$attrs" />{{ label }}</label>
</template>
