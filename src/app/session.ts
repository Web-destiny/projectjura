import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Template } from '../domain/models';
export const useSession = defineStore('session', () => {
  const selected = ref<Template>();
  const notice = ref('');
  return { selected, notice };
});
