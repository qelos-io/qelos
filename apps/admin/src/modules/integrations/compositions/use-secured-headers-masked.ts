import { ref } from 'vue';

const securedHeadersMasked = ref<Record<string, string>>({});

export function useSecuredHeadersMasked() {
  return { securedHeadersMasked };
}  