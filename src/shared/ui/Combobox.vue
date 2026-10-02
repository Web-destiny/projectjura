<script setup lang="ts">
import { useId } from 'vue';
defineOptions({ inheritAttrs: false });
defineProps<{ label: string; options: string[] }>();
const model = defineModel<string>({ default: '' });
const id = useId();
</script>
<template>
  <label :for="id"
    >{{ label }}<input :id="id" v-model="model" :list="`${id}-options`" v-bind="$attrs" /><datalist
      :id="`${id}-options`"
    >
      <option v-for="option in options" :key="option" :value="option"></option></datalist
  ></label>
</template>
