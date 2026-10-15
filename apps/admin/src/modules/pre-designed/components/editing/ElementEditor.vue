<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { Delete, Plus } from '@element-plus/icons-vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { hasEditableText, readElement, writeElement, type StyleRow } from '../../services/element-attributes';
import { CLASS_GROUPS, STYLE_PROPERTY_GROUPS, customClassesOf } from '../../services/style-suggestions';

const props = defineProps<{ element: HTMLElement }>();
const emit = defineEmits<{ (e: 'change'): void }>();

type Tab = 'properties' | 'style' | 'html';
const tab = ref<Tab>('properties');
const canEditText = hasEditableText(props.element);

const state = reactive(readElement(props.element));
const code = ref('');
let applying = false;

const regular = computed(() => state.fields.filter((f) => !f.dynamic));
const dynamic = computed(() => state.fields.filter((f) => f.dynamic));
const customClasses = computed(() => customClassesOf(state.classes));

watch(
  state,
  () => {
    if (applying) return;
    writeElement(props.element, { id: state.id, classes: state.classes, style: state.style, html: canEditText ? state.html : undefined, fields: state.fields });
    emit('change');
  },
  { deep: true },
);

function addStyleRow() {
  state.style.push({ property: '', value: '' } as StyleRow);
}

/* the HTML tab works on the whole element: its code is the source while it is open */
watch(tab, (now, before) => {
  if (now === 'html') code.value = props.element.outerHTML;
  if (before === 'html') applyCode();
});

function applyCode() {
  const template = document.createElement('template');
  template.innerHTML = code.value;
  const next = template.content.firstElementChild;
  if (!next) return;
  applying = true;
  props.element.getAttributeNames().forEach((name) => props.element.removeAttribute(name));
  next.getAttributeNames().forEach((name) => {
    try {
      props.element.setAttribute(name, next.getAttribute(name) ?? '');
    } catch {
      /* skipped */
    }
  });
  props.element.innerHTML = next.innerHTML;
  Object.assign(state, readElement(props.element));
  applying = false;
  emit('change');
}

let codeTimer: ReturnType<typeof setTimeout> | undefined;
function onCode(value: string) {
  code.value = value;
  clearTimeout(codeTimer);
  codeTimer = setTimeout(applyCode, 500);
}
</script>

<template>
  <div class="editor">
    <el-radio-group v-model="tab" class="tabs">
      <el-radio-button value="properties">{{ $t('Properties') }}</el-radio-button>
      <el-radio-button value="style">{{ $t('Style') }}</el-radio-button>
      <el-radio-button value="html">{{ $t('HTML') }}</el-radio-button>
    </el-radio-group>

    <el-form v-if="tab === 'properties'" label-position="top" @submit.prevent>
      <el-form-item v-if="canEditText" :label="$t('Content')">
        <el-input v-model="state.html" type="textarea" :rows="3" dir="auto" />
      </el-form-item>
      <el-form-item v-for="field in regular" :key="field.propName" :label="field.title">
        <el-switch v-if="field.type === 'switch'" v-model="field.value" />
        <el-select v-else-if="field.type === 'select'" v-model="field.value as string" clearable>
          <el-option v-for="option in field.options" :key="option.value" :label="$t(option.label)" :value="option.value" />
        </el-select>
        <el-color-picker v-else-if="field.type === 'color'" v-model="field.value as string" />
        <el-input v-else v-model="field.value as string" dir="auto" />
      </el-form-item>
      <el-form-item :label="$t('ID')">
        <el-input v-model="state.id" dir="ltr" />
      </el-form-item>
      <template v-if="dynamic.length">
        <h3 class="sub">{{ $t('Data and logic') }}</h3>
        <p class="hint">{{ $t('Expressions that connect this block to the data of the page.') }}</p>
        <el-form-item v-for="field in dynamic" :key="field.propName" :label="field.propName">
          <el-input v-model="field.value as string" dir="ltr" class="code" />
        </el-form-item>
      </template>
    </el-form>

    <el-form v-else-if="tab === 'style'" label-position="top" @submit.prevent>
      <el-form-item :label="$t('Classes')">
        <el-select v-model="state.classes" multiple filterable allow-create default-first-option :reserve-keyword="false" :placeholder="$t('Select or add classes')">
          <el-option-group v-for="group in CLASS_GROUPS" :key="group.title" :label="$t(group.title)">
            <el-option v-for="item in group.items" :key="item.value" :value="item.value" :label="item.value">
              <span class="class-option"><span>{{ item.value }}</span><small>{{ item.hint }}</small></span>
            </el-option>
          </el-option-group>
          <el-option-group v-if="customClasses.length" :label="$t('Custom')">
            <el-option v-for="item in customClasses" :key="item" :value="item" :label="item" />
          </el-option-group>
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('Inline style')">
        <div class="styles">
          <div v-for="(row, index) in state.style" :key="index" class="style-row">
            <el-select v-model="row.property" filterable allow-create default-first-option :placeholder="$t('Property')">
              <el-option-group v-for="group in STYLE_PROPERTY_GROUPS" :key="group.title" :label="$t(group.title)">
                <el-option v-for="item in group.items" :key="item" :value="item" :label="item" />
              </el-option-group>
            </el-select>
            <el-input v-model="row.value" dir="ltr" :placeholder="$t('Value')" />
            <el-button text circle :icon="Delete" :aria-label="$t('Remove')" @click="state.style.splice(index, 1)" />
          </div>
          <el-button text :icon="Plus" @click="addStyleRow">{{ $t('Add style') }}</el-button>
        </div>
      </el-form-item>
    </el-form>

    <div v-else class="code-box">
      <Monaco :model-value="code" language="html" height="360px" @update:model-value="onCode" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tabs {
  align-self: flex-start;
}

.sub {
  margin: 8px 0 2px;
  padding: 0;
  font-size: 1rem;
}

.hint {
  margin: 0 0 10px;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  text-align: start;
}

.code :deep(input) {
  font-family: var(--el-font-family-mono, ui-monospace, monospace);
  font-size: 0.85rem;
}

.class-option {
  display: flex;
  justify-content: space-between;
  gap: 12px;

  small {
    color: var(--el-text-color-placeholder);
  }
}

.styles {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  inline-size: 100%;
}

.style-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  align-items: center;
  gap: 6px;
  inline-size: 100%;
}
</style>
