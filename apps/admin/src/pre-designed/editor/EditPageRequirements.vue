<script setup lang="ts">
import { capitalize, ref, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import BlueprintSelector from '@/modules/no-code/components/BlueprintSelector.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { getPlural } from '@/modules/core/utils/texts';

const editorMode = ref(false)

const model = defineModel<any[]>();

const modelString = ref(json(model.value))

watch(model.value, () => {
  modelString.value = json(model.value);
}, { deep: true })

function toggleEditorMode() {
  editorMode.value = !editorMode.value;
  if (editorMode.value) {
    modelString.value = json(model.value);
  } else {
    model.value = JSON.parse(modelString.value);
  }
}

function addRequirement() {
  model.value.push({
    key: '',
    fromBlueprint: {
      name: ''
    },
  })
}

function getRowType(row: any) {
  if (row.fromBlueprint) {
    return 'fromBlueprint';
  }
  if (row.fromCrud) {
    return 'fromCrud';
  }
  if (row.fromData) {
    return 'fromData';
  }
  if (row.fromHTTP) {
    return 'fromHTTP';
  }
}

function updateRowType(row: any, type: string) {
  const data = row[getRowType(row)];
  delete row[getRowType(row)]

  row[type] = data;
}

function json(obj: any) {
  return JSON.stringify(obj, null, 2)
}

function updateRowJSON(row: any, key: string, value: string) {
  try {
    row[key] = JSON.parse(value);
  } catch {
    //
  }
}

function clearIfEmpty($event: any, obj: any, key: string) {
  if ($event === '') {
    delete obj[key];
  }
}

function getBlueprintInstructionsCode(row) {
  if (row.fromBlueprint && row.fromBlueprint.name) {
    const blueprintName = capitalize(row.fromBlueprint.name);
    const texts = [
      `<strong>{{${row.key}.result}}</strong> will be ${row.fromBlueprint.identifier ? ('a ' + blueprintName + ' entity') : 'an array of ' + getPlural(blueprintName) + ' entities'}`,
      `<strong>{{${row.key}.loading}}</strong> and <strong>{{${row.key}.loaded}}</strong> can help you distinguish rather the API call is loading or loaded.`
    ]
    return texts.join('<br>')
  }
}

function getHttpInstructionsCode(row) {
  if (row.fromHTTP) {
    const texts = [
      `<strong>{{${row.key}.result}}</strong> will be the response of the HTTP request`,
      `<strong>{{${row.key}.loading}}</strong> and <strong>{{${row.key}.loaded}}</strong> can help you distinguish rather the API call is loading or loaded.`
    ]
    return texts.join('<br>')
  }
}

</script>

<template>
  <el-button-group>
    <el-button @click="toggleEditorMode">
      <el-icon>
        <font-awesome-icon :icon="['fas', 'code']"/>
      </el-icon>
      <span>{{ $t('Toggle Code Editor') }}</span>
    </el-button>
    <el-button @click="addRequirement">{{ $t('Add Requirement') }}</el-button>
  </el-button-group>
  <Monaco v-if="editorMode" ref="requirementsEditor"
          v-model="modelString"
          language="json"
          style="min-height:65vh"/>
  <div v-else class="flex-1">
    <BlockItem v-for="(row, index) in model" :key="index">
      <template #header>
        <el-input required v-model="row.key" :placeholder="$t('Key')"/>
      </template>
      <template #default>
        <FormInput type="select" title="Requirement Type" :model-value="getRowType(row)"
                   @update:model-value="updateRowType(row, $event)">
          <template #options>
            <el-option value="fromBlueprint" :label="$t('Blueprint')"/>
            <el-option value="fromCrud" :label="$t('CRUD')"/>
            <el-option value="fromData" :label="$t('Data')"/>
            <el-option value="fromHTTP" :label="$t('HTTP')"/>
          </template>
        </FormInput>
        <div>
          <div v-if="row.fromBlueprint">
            <FormRowGroup>
              <BlueprintSelector v-model="row.fromBlueprint.name"/>
              <FormInput v-model="row.fromBlueprint.identifier" title="Entity Identifier"
                         label="Keep empty to load all blueprint entities"
                         placeholder="Try to use: {{identifier}} for dynamic route param"
                         @update:model-value="clearIfEmpty($event, row.fromBlueprint, 'identifier')"/>
            </FormRowGroup>
            <div>
              <el-checkbox v-model="row.lazy">
                {{ $t('Lazy') }}
              </el-checkbox>
              <el-checkbox :model-value="row.fromBlueprint.query?.$populate"
                           @update:model-value="row.fromBlueprint.query = { ...row.fromBlueprint.query, $populate: $event || undefined }">
                {{ $t('Populate') }}
              </el-checkbox>
              <el-checkbox :model-value="!!row.fromBlueprint.query?.$outerPopulate"
                           @update:model-value="row.fromBlueprint.query = { ...row.fromBlueprint.query, $outerPopulate: $event ? 'setKey:blueprintName:scope' : undefined }">
                {{ $t('Outer Populate') }}
              </el-checkbox>
              <el-checkbox :model-value="!!row.fromBlueprint.query?.$sort"
                           @update:model-value="row.fromBlueprint.query = { ...row.fromBlueprint.query, $sort: $event ? '{{query.sortBy}}' : undefined }">
                {{ $t('Sort') }}
              </el-checkbox>
              <el-checkbox :model-value="!!row.fromBlueprint.query?.$limit"
                           @update:model-value="row.fromBlueprint.query = { ...row.fromBlueprint.query, $limit: $event ? 100 : undefined }">
                {{ $t('Limit # Documents') }}
              </el-checkbox>
              <el-checkbox :model-value="!!row.fromBlueprint.query?.$page"
                           @update:model-value="row.fromBlueprint.query = { ...row.fromBlueprint.query, $page: $event ? '{{query.page}}' : undefined }">
                {{ $t('Page') }}
              </el-checkbox>
            </div>
            <el-form-item :label="$t('Query Params')">
              <Monaco :model-value="json(row.fromBlueprint.query) || '{}'"
                      style="max-height:200px;"
                      @update:model-value="updateRowJSON(row.fromBlueprint, 'query', $event);"/>
            </el-form-item>
            <details>
              <summary>
                {{ $t('Usage Instructions') }}
              </summary>
              <p>
                {{ $t('You can use the following variables in your template:') }}
                <br>
                <i v-html="getBlueprintInstructionsCode(row)"></i>
              </p>
            </details>
          </div>
          <div v-if="row.fromCrud">
            <FormRowGroup>
              <el-form-item :label="$t('CRUD Name')" required>
                <el-select v-model="row.fromCrud.name">
                  <el-option :label="$t('Configurations')" value="configurations"/>
                  <el-option :label="$t('Blocks')" value="blocks"/>
                  <el-option :label="$t('Blueprints')" value="blueprints"/>
                  <el-option :label="$t('Invites')" value="invites"/>
                  <el-option :label="$t('Plugins')" value="plugins"/>
                  <el-option :label="$t('Storages')" value="storages"/>
                  <el-option :label="$t('Users')" value="users"/>
                  <el-option :label="$t('Workspaces')" value="workspaces"/>
                </el-select>
              </el-form-item>
              <FormInput v-model="row.fromCrud.identifier" title="Identifier"
                         placeholder="Try to use: {{identifier}} for dynamic route param"
                         @update:model-value="clearIfEmpty($event, row.fromCrud, 'identifier')"/>
            </FormRowGroup>
            <div>
              <el-checkbox v-model="row.lazy">
                {{ $t('Lazy') }}
              </el-checkbox>
            </div>
          </div>
          <Monaco v-if="row.fromData" :model-value="json(row.fromData)"
                  style="max-height:350px;"
                  @update:model-value="updateRowJSON(row, 'fromData', $event)"/>
          <div v-if="row.fromHTTP">
            <FormRowGroup>
              <FormInput v-model="row.fromHTTP.method" title="Method" placeholder="GET"
                         @update:model-value="clearIfEmpty($event, row.fromHTTP, 'method')"/>
              <FormInput v-model="row.fromHTTP.uri" title="URL" placeholder="https://example.com/api" required/>
            </FormRowGroup>
            <div>
              <el-checkbox v-model="row.lazy">
                {{ $t('Lazy') }}
              </el-checkbox>
            </div>
            <el-form-item :label="$t('Query Params')">
              <Monaco :model-value="json(row.fromHTTP.query) || '{}'"
                      style="max-height:200px;"
                      @update:model-value="updateRowJSON(row.fromHTTP, 'query', $event);"/>
            </el-form-item>
            <details>
              <summary>
                {{ $t('Usage Instructions') }}
              </summary>
              <p>
                {{ $t('You can use the following variables in your template:') }}
                <br>
                <i v-html="getHttpInstructionsCode(row)"></i>
              </p>
            </details>
          </div>
        </div>
      </template>
      <template #actions>
        <RemoveButton wide @click="model.splice(model.indexOf(row), 1)"/>
      </template>
    </BlockItem>
  </div>
</template>
<style scoped>
details {
  margin-inline-start: 20px;

  &[open] > summary {
    list-style-type: disclosure-open;
  }

  > summary {
    list-style-type: disclosure-closed;
    user-select: none;
  }
}
</style>