import { computed, inject, nextTick, onMounted, provide, ref, shallowRef, watch, type ComputedRef, type InjectionKey, type Ref } from 'vue';

interface DraftEntry {
  dirty: ComputedRef<boolean>;
  discard: () => void;
}

export interface ConfigShell {
  /** bumped by the page after a successful save, so forms treat their current values as the saved ones */
  savedTick: Ref<number>;
  register: (entry: DraftEntry) => void;
}

const CONFIG_SHELL: InjectionKey<ConfigShell> = Symbol('config-shell');

/** Used by the page shell: collects the form's draft state and offers dirty / discard / saved. */
export function provideConfigShell() {
  const entry = shallowRef<DraftEntry | null>(null);
  const savedTick = ref(0);
  provide(CONFIG_SHELL, {
    savedTick,
    register: (value) => (entry.value = value),
  });
  return {
    dirty: computed(() => !!entry.value?.dirty.value),
    hasForm: computed(() => !!entry.value),
    discard: () => entry.value?.discard(),
    markSaved: () => savedTick.value++,
  };
}

/**
 * Used by a configuration form. Tracks whether `edited` differs from the saved values and hands that to the shell,
 * which shows the "unsaved changes" bar. Forms keep their own validation and emit `save` as before.
 */
export function useConfigDraft(edited: Ref<unknown>) {
  const shell = inject(CONFIG_SHELL, null);
  const snapshot = () => JSON.stringify(edited.value);
  const baseline = ref(snapshot());
  const dirty = computed(() => snapshot() !== baseline.value);

  // forms may normalise their values right after mounting; that is not a user change
  onMounted(() => nextTick(() => (baseline.value = snapshot())));

  shell?.register({
    dirty,
    discard: () => {
      edited.value = JSON.parse(baseline.value);
    },
  });

  if (shell) watch(shell.savedTick, () => (baseline.value = snapshot()));

  return { dirty };
}
