<script setup lang="ts">
import { capitalize, computed, toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import { useComponentCatalog } from '../../compositions/component-catalog';
import { usePropOptions } from '../../compositions/prop-options';
import type { DataSource, PropValues } from '../../services/build-component';

const props = defineProps<{ componentKey: string }>();
const values = defineModel<PropValues>('values', { required: true });
const source = defineModel<DataSource>('source', { required: true });

const { t } = useI18n();
const cruds = toRef(usePluginsMicroFrontends(), 'cruds');
const blueprints = toRef(useBlueprintsStore(), 'blueprints');
const { availableComponents, getColumnsFromBlueprint } = useComponentCatalog();
const getOptions = usePropOptions();

const descriptor = computed(() => availableComponents.value[props.componentKey]);

const groups = computed(() => {
  const map = new Map<string, { key: string; title: string; hint?: string; props: any[] }>();
  const group = (key: string, title: string, hint?: string) => map.get(key) || map.set(key, { key, title, hint, props: [] }).get(key)!;
  (descriptor.value?.requiredProps || []).forEach((prop) => {
    if (prop.source === 'requirements') group('data', t('Data'), t('Bind to resources or blueprints.')).props.push(prop);
    else if (prop.source === 'blueprint') group('blueprint', t('Blueprint context'), t('Configure schema-aware behavior.')).props.push(prop);
    else group('configuration', t('Display & behavior')).props.push(prop);
  });
  return [...map.values()];
});

function refillColumns(blueprintId: string) {
  const columns = getColumnsFromBlueprint(blueprintId);
  if (columns) values.value.columns = columns;
}

const addRow = (key: string) => {
  if (!Array.isArray(values.value[key])) values.value[key] = [];
  values.value[key].push({});
};
const removeRow = (key: string, index: number) => values.value[key]?.splice(index, 1);
</script>

<template>
  <el-form label-position="top" class="form" @submit.prevent>
    <p v-if="!groups.length" class="none">{{ $t('This component needs no settings.') }}</p>
    <section v-for="group in groups" :key="group.key">
      <h3>{{ group.title }}</h3>
      <p v-if="group.hint" class="hint">{{ group.hint }}</p>
      <template v-for="prop in group.props" :key="prop.prop">
        <template v-if="prop.source === 'requirements'">
          <el-form-item>
            <el-radio-group v-model="source">
              <el-radio-button value="blueprints">{{ $t('Blueprints') }}</el-radio-button>
              <el-radio-button value="cruds">{{ $t('Resources') }}</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="source === 'cruds'" :label="$t('Choose Resource')">
            <el-select v-model="values[prop.prop]" :placeholder="$t('Select')" filterable>
              <el-option v-for="(crud, key) in cruds" :key="key" :label="capitalize(String(key))" :value="String(key)" />
            </el-select>
          </el-form-item>
          <el-form-item v-else :label="$t('Choose Blueprint')">
            <el-select v-model="values[prop.prop]" :placeholder="$t('Select')" filterable @change="refillColumns(values[prop.prop])">
              <el-option v-for="blueprint in blueprints" :key="blueprint.identifier" :label="blueprint.name" :value="blueprint.identifier" />
            </el-select>
          </el-form-item>
        </template>
        <el-form-item v-else-if="prop.source === 'blueprint'" :label="$t('Choose Blueprint')">
          <el-select v-model="values[prop.prop]" :placeholder="$t('Select')" filterable>
            <el-option v-for="blueprint in blueprints" :key="blueprint.identifier" :label="blueprint.name" :value="blueprint.identifier" />
          </el-select>
        </el-form-item>
        <div v-else-if="prop.type === 'array'" class="rows">
          <h4 v-if="prop.label">{{ prop.label }}</h4>
          <div v-for="(row, index) in values[prop.prop]" :key="index" class="row">
            <FormInput v-for="child in prop.children" :key="child.prop" :type="child.type" :title="child.label" :options="getOptions(child)" :select-options="child.selectOptions" v-model="row[child.prop]" />
            <RemoveButton class="remove" @click="removeRow(prop.prop, index)" />
          </div>
          <AddMore @click="addRow(prop.prop)" />
        </div>
        <FormInput v-else :type="prop.type" :title="prop.label" :label="prop.description" :placeholder="prop.placeholder" :options="getOptions(prop)" :select-options="prop.selectOptions" v-model="values[prop.prop]" />
      </template>
    </section>
  </el-form>
</template>

<style scoped lang="scss">
.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

section h3 {
  margin: 0 0 4px;
  padding: 0;
  font-size: 1rem;
}

.hint,
.none {
  margin: 0 0 10px;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  text-align: start;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-block-end: 12px;

  h4 {
    margin: 0;
    padding: 0;
  }
}

.row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.remove {
  align-self: flex-end;
}
</style>
