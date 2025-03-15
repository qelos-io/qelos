<script setup lang="ts">
import { ref, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import BlueprintSelector from '@/modules/no-code/components/BlueprintSelector.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';

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
              <el-checkbox :model-value="row.fromBlueprint.query?.$populate"
                                 @update:model-value="row.fromBlueprint.query = { ...row.fromBlueprint.query, $populate: $event || undefined }">
                {{ $t('Populate') }}
              </el-checkbox>
              <el-checkbox :model-value="row.fromBlueprint.query?.$outerPopulate"
                           @update:model-value="row.fromBlueprint.query = { ...row.fromBlueprint.query, $outerPopulate: $event || undefined }">
                {{ $t('Outer Populate') }}
              </el-checkbox>
            </div>
            <el-form-item :label="$t('Query Params')">
              <Monaco :model-value="json(row.fromBlueprint.query) || '{}'"
                      style="max-height:100px;"
                      @update:model-value="updateRowJSON(row.fromBlueprint, 'query', $event);"/>
            </el-form-item>
          </div>
          <div v-if="row.fromCrud">
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
          </div>
          <Monaco v-if="row.fromData" :model-value="json(row.fromData)"
                  style="max-height:350px;"
                  @update:model-value="updateRowJSON(row, 'fromData', $event)"/>
          <div v-if="row.fromHTTP">
            <FormInput v-model="row.fromHTTP.uri" title="URL" placeholder="https://example.com/api" required/>
            <FormInput v-model="row.fromHTTP.method" title="Method" placeholder="GET"
                       @update:model-value="clearIfEmpty($event, row.fromHTTP, 'method')"/>
            <el-form-item :label="$t('Query Params')">
              <Monaco :model-value="json(row.fromHTTP.query) || '{}'"
                      style="max-height:100px;"
                      @update:model-value="updateRowJSON(row.fromHTTP, 'query', $event);"/>
            </el-form-item>
          </div>
        </div>
      </template>
      <template #actions>
        <RemoveButton wide @click="model.splice(model.indexOf(row), 1)"/>
      </template>
    </BlockItem>
  </div>
</template>