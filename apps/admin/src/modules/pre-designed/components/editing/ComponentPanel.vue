<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import { useComponentCatalog } from '../../compositions/component-catalog';
import { clearPreview, selectBlock, setPreview } from '../../compositions/page-editing';
import { buildComponent, initialPropValues, insertBlock, mergeRequirements, type Anchor, type BuiltComponent, type DataSource, type PropValues } from '../../services/build-component';
import { describeElement, serializeStructure } from '../../services/structure-ops';
import ComponentForm from './ComponentForm.vue';
import ComponentPicker from './ComponentPicker.vue';
import ElementEditor from './ElementEditor.vue';

const props = defineProps<{
  /** the page as saved: drafts are built from it */
  savedStructure: string;
  /** adding a block: where (an empty object adds it at the end) */
  anchor?: Anchor;
  /** editing a block: the markup copy being edited and the block in it */
  edit?: { template: HTMLTemplateElement; editChild: HTMLElement; qlId?: string };
}>();

const emit = defineEmits<{
  (e: 'add', built: BuiltComponent): void;
  (e: 'edit', element: HTMLElement): void;
  (e: 'close'): void;
}>();

const route = useRoute();
const { availableComponents } = useComponentCatalog();

const open = ref(true);
const step = ref<'pick' | 'configure'>('pick');
const key = ref<string>();
const values = ref<PropValues>({});
const source = ref<DataSource>('blueprints');

const descriptor = computed(() => (key.value ? availableComponents.value[key.value] : undefined));
const isEdit = computed(() => !!props.edit);
const title = computed(() => {
  if (isEdit.value) return props.edit!.editChild.tagName.toLowerCase();
  return step.value === 'pick' ? undefined : descriptor.value?.title || key.value;
});
const subtitle = computed(() => (isEdit.value ? describeElement(props.edit!.editChild) : ''));

function pick(selected: string) {
  key.value = selected;
  values.value = initialPropValues(availableComponents.value[selected]);
  step.value = 'configure';
}

const built = computed(() => (key.value && descriptor.value ? buildComponent(key.value, descriptor.value, values.value, source.value) : undefined));

/* the page behind the panel shows the block as it is being designed */
let timer: ReturnType<typeof setTimeout> | undefined;
function schedule(draft: () => void, delay = 350) {
  clearTimeout(timer);
  timer = setTimeout(draft, delay);
}

function revealSoon(qlId?: string) {
  if (!qlId) return;
  nextTick(() => setTimeout(() => selectBlock(qlId, { reveal: true }), 450));
}

watch(
  [built, () => step.value],
  () => {
    if (isEdit.value || step.value !== 'configure' || !built.value) return;
    schedule(() => {
      const { html, qlId } = insertBlock(props.savedStructure, built.value!, props.anchor);
      const saved = (route.meta.screenRequirements as any[]) || [];
      setPreview(html, mergeRequirements(saved, Object.values(built.value!.requirements)));
      revealSoon(qlId);
    });
  },
  { deep: true },
);

function onElementChange() {
  schedule(() => {
    setPreview(serializeStructure(props.edit!.template), null);
    revealSoon(props.edit!.qlId);
  });
}

function back() {
  step.value = 'pick';
  key.value = undefined;
  clearPreview();
  selectBlock(null);
}

function close() {
  open.value = false;
}

function confirm() {
  if (isEdit.value) emit('edit', props.edit!.editChild);
  else if (built.value) emit('add', built.value);
}

watch(open, (isOpen) => {
  if (!isOpen) {
    clearTimeout(timer);
    clearPreview();
    emit('close');
  }
});
onBeforeUnmount(() => {
  clearTimeout(timer);
  clearPreview();
});

const direction = computed(() => (document.documentElement.dir === 'rtl' ? 'ltr' : 'rtl'));
const placement = computed(() => {
  if (isEdit.value) return null;
  if (props.anchor?.beforeQlId) return 'before';
  if (props.anchor?.afterQlId) return 'after';
  return 'end';
});
</script>

<template>
  <el-drawer v-model="open" :modal="false" :lock-scroll="false" :close-on-click-modal="false" :direction="direction" size="min(480px, 100%)" class="component-panel" append-to-body @keydown.esc="close">
    <template #header>
      <div class="head">
        <el-button v-if="!isEdit && step === 'configure'" text circle :icon="ArrowLeft" class="back" :aria-label="$t('Back')" @click="back" />
        <div class="titles">
          <h2 :dir="isEdit ? 'ltr' : 'auto'">{{ title || $t('Add component') }}</h2>
          <p v-if="subtitle" dir="auto">{{ subtitle }}</p>
          <p v-else-if="!isEdit && step === 'configure'">
            {{ placement === 'before' ? $t('Added before the selected block') : placement === 'after' ? $t('Added after the selected block') : $t('Added at the end of the page') }}
          </p>
        </div>
      </div>
    </template>

    <ComponentPicker v-if="!isEdit && step === 'pick'" @pick="pick" />
    <ComponentForm v-else-if="!isEdit && key" v-model:values="values" v-model:source="source" :component-key="key" />
    <ElementEditor v-else-if="edit" :element="edit.editChild" @change="onElementChange" />

    <template v-if="isEdit || step === 'configure'" #footer>
      <div class="footer">
        <el-button @click="close">{{ $t('Cancel') }}</el-button>
        <el-button type="primary" @click="confirm">{{ isEdit ? $t('Save changes') : $t('Add to page') }}</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped lang="scss">
.head {
  display: flex;
  align-items: center;
  gap: 4px;
  min-inline-size: 0;
}

.back {
  margin-inline-start: -8px;
}

.titles {
  min-inline-size: 0;

  h2 {
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-size: 1.1rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 0;
    padding: 0;
    overflow: hidden;
    color: var(--el-text-color-secondary);
    font-size: 0.85rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
