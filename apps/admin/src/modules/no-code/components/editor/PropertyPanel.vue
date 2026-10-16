<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { BlueprintPropertyType, IBlueprint, IBlueprintPropertyDescriptor } from '@qelos/global-types';
import { storeToRefs } from 'pinia';
import Monaco from '@/modules/users/components/Monaco.vue';
import JsonSchemaBuilder from '../blueprint-form/JsonSchemaBuilder.vue';
import { useBlueprintsStore } from '../../store/blueprints';
import {
  PROPERTY_TYPE_LABELS,
  getPropertyLink,
  keyFromTitle,
  renameProperty,
  setPropertyLink,
  uniquePropertyKey,
} from '../../services/blueprint-editor';

const props = defineProps<{
  blueprint: Partial<IBlueprint>;
  propertyKey: string;
  /** a property added in this session keeps its key in step with the title until the key is edited */
  followTitle?: boolean;
}>();
const emit = defineEmits<{ renamed: [key: string]; keyEdited: [] }>();

const { blueprints } = storeToRefs(useBlueprintsStore());

const property = computed<IBlueprintPropertyDescriptor>(() => props.blueprint.properties?.[props.propertyKey] as IBlueprintPropertyDescriptor);
const typeOptions = Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const isString = computed(() => property.value?.type === BlueprintPropertyType.STRING);

function patch(changes: Partial<IBlueprintPropertyDescriptor>) {
  props.blueprint.properties = {
    ...props.blueprint.properties,
    [props.propertyKey]: { ...property.value, ...changes },
  };
}

function rename(next: string) {
  const clean = keyFromTitle(next);
  if (!clean || clean === props.propertyKey) return false;
  if (props.blueprint.properties?.[clean]) return false;
  Object.assign(props.blueprint, renameProperty(props.blueprint, props.propertyKey, clean));
  emit('renamed', clean);
  return true;
}

function onTitle(title: string) {
  patch({ title });
  if (props.followTitle && title.trim()) {
    const others = Object.fromEntries(Object.entries(props.blueprint.properties || {}).filter(([key]) => key !== props.propertyKey));
    rename(uniquePropertyKey(others, keyFromTitle(title)));
  }
}

const keyDraft = ref(props.propertyKey);
watch(() => props.propertyKey, (key) => (keyDraft.value = key));
function commitKey() {
  emit('keyEdited');
  if (!rename(keyDraft.value)) keyDraft.value = props.propertyKey;
}

function onType(type: string) {
  // min / max mean a range for numbers and a length for text, so they never carry over
  const changes: Partial<IBlueprintPropertyDescriptor> = { type: type as BlueprintPropertyType, min: undefined, max: undefined };
  if (type !== BlueprintPropertyType.STRING) {
    changes.enum = undefined;
    Object.assign(props.blueprint, setPropertyLink(props.blueprint, props.propertyKey, null));
  }
  if (type !== BlueprintPropertyType.OBJECT) changes.schema = undefined;
  patch(changes);
}

const numberValue = (value: number | undefined) => (value ?? '') as string | number;
const toNumber = (value: string) => (value === '' || Number.isNaN(Number(value)) ? undefined : Number(value));

const link = computed({
  get: () => getPropertyLink(props.blueprint, props.propertyKey) || '',
  set: (target: string) => Object.assign(props.blueprint, setPropertyLink(props.blueprint, props.propertyKey, target || null)),
});
const linkable = computed(() => {
  const list = (blueprints.value || []).filter((item) => item.identifier !== props.blueprint.identifier);
  const self = { identifier: props.blueprint.identifier || '', name: props.blueprint.name || '' };
  return props.blueprint.identifier ? [{ ...self, itself: true }, ...list] : list;
});

// The schema editors work on text; the blueprint keeps the parsed object.
const schemaText = ref(property.value?.schema ? JSON.stringify(property.value.schema, null, 2) : '');
const schemaMode = ref<'visual' | 'json'>('visual');
watch(() => props.propertyKey, () => {
  schemaText.value = property.value?.schema ? JSON.stringify(property.value.schema, null, 2) : '';
});
watch(schemaText, (text) => {
  try {
    patch({ schema: text.trim() ? JSON.parse(text) : undefined });
  } catch {
    /* the editor keeps the invalid text until it parses */
  }
});
</script>

<template>
  <div v-if="property" class="panel">
    <div class="grid">
      <el-form-item :label="$t('Title')" required class="span">
        <el-input :model-value="property.title" dir="auto" :placeholder="$t('What is this property called?')" @update:model-value="onTitle" />
      </el-form-item>

      <el-form-item :label="$t('Type')">
        <el-select :model-value="property.type" @update:model-value="onType">
          <el-option v-for="option in typeOptions" :key="option.value" :label="$t(option.label)" :value="option.value" />
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('Key')">
        <el-input v-model="keyDraft" dir="ltr" class="mono" :aria-describedby="`key-hint-${propertyKey}`" @change="commitKey" @keydown.enter.prevent="commitKey" />
        <p :id="`key-hint-${propertyKey}`" class="hint">{{ $t('Where the value lives on each entity. Renaming updates links, calculations and limits.') }}</p>
      </el-form-item>

      <el-form-item :label="$t('Description')" class="span">
        <el-input :model-value="property.description" dir="auto" :placeholder="$t('Shown to people filling this in, and to AI agents')" @update:model-value="patch({ description: $event })" />
      </el-form-item>

      <el-form-item v-if="isString" :label="$t('Allowed values')" class="span">
        <el-select
          :model-value="property.enum || []"
          multiple
          filterable
          allow-create
          default-first-option
          :reserve-keyword="false"
          :placeholder="$t('Leave empty to allow any text')"
          @update:model-value="patch({ enum: $event.length ? $event : undefined })"
        />
      </el-form-item>

      <el-form-item v-if="isString" :label="$t('Links to')" class="span">
        <el-select v-model="link" clearable filterable :placeholder="$t('Not a link')">
          <el-option v-for="item in linkable" :key="item.identifier" :label="item.itself ? `${item.name || item.identifier} (${$t('this blueprint')})` : item.name" :value="item.identifier" />
        </el-select>
        <p class="hint">{{ $t('Store the id of an entity from another blueprint. It is returned together with that entity.') }}</p>
      </el-form-item>

      <template v-if="property.type === BlueprintPropertyType.NUMBER">
        <el-form-item :label="$t('Minimum')">
          <el-input :model-value="numberValue(property.min)" type="number" dir="ltr" @update:model-value="patch({ min: toNumber($event) })" />
        </el-form-item>
        <el-form-item :label="$t('Maximum')">
          <el-input :model-value="numberValue(property.max)" type="number" dir="ltr" @update:model-value="patch({ max: toNumber($event) })" />
        </el-form-item>
      </template>

      <el-form-item v-if="isString" :label="$t('Longest allowed text')">
        <el-input :model-value="numberValue(property.max)" type="number" dir="ltr" @update:model-value="patch({ max: toNumber($event) })" />
      </el-form-item>
    </div>

    <div class="switches">
      <label class="switch-row">
        <el-switch :model-value="property.required" @update:model-value="patch({ required: !!$event })" />
        <span>
          <strong>{{ $t('Required') }}</strong>
          <small>{{ $t('An entity cannot be saved without it') }}</small>
        </span>
      </label>
      <label class="switch-row">
        <el-switch :model-value="property.multi" @update:model-value="patch({ multi: !!$event })" />
        <span>
          <strong>{{ $t('A list of values') }}</strong>
          <small>{{ $t('Each entity can hold several') }}</small>
        </span>
      </label>
    </div>

    <div v-if="property.type === BlueprintPropertyType.OBJECT" class="schema">
      <div class="schema-head">
        <h4>{{ $t('Object shape') }}</h4>
        <el-button size="small" text @click="schemaMode = schemaMode === 'visual' ? 'json' : 'visual'">
          {{ schemaMode === 'visual' ? $t('Edit as JSON schema') : $t('Use the visual builder') }}
        </el-button>
      </div>
      <JsonSchemaBuilder v-if="schemaMode === 'visual'" v-model="schemaText" @toggle-mode="schemaMode = 'json'" />
      <Monaco v-else v-model="schemaText" language="json" height="320px" />
    </div>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 0 16px;
}

.span {
  grid-column: 1 / -1;
}

.grid :deep(.el-form-item) {
  margin-block-end: 14px;
}

.mono :deep(input) {
  font-family: var(--el-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.9em;
}

.hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.switches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.switch-row span {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.switch-row small {
  color: var(--el-text-color-secondary);
}

.schema-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-block-end: 8px;
}

.schema-head h4 {
  margin: 0;
  font-size: 0.95rem;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
