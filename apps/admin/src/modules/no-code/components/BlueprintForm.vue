<script setup lang="ts">
import { computed, provide, reactive, ref, toRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IBlueprint } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';

import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import BlueprintSelector from '@/modules/no-code/components/BlueprintSelector.vue';

import { getKeyFromName } from '@/modules/core/utils/texts';
import BlueprintLimitationsInput from '@/modules/no-code/components/blueprint-form/BlueprintLimitationsInput.vue';
import BlueprintPermissionsTab from '@/modules/no-code/components/blueprint-form/BlueprintPermissionsTab.vue';
import BlueprintPropertiesTab from '@/modules/no-code/components/blueprint-form/BlueprintPropertiesTab.vue';
import BlueprintGeneralTab from '@/modules/no-code/components/blueprint-form/BlueprintGeneralTab.vue';
import BlueprintEventsTab from '@/modules/no-code/components/blueprint-form/BlueprintEventsTab.vue';

// temporary sample
const availableLabels = ['*', 'supplier', 'store', 'consumer'];
const editor = ref()
const route = useRoute();
const router = useRouter();
const props = withDefaults(defineProps<{
  submitting: boolean;
  blueprint: Partial<IBlueprint>;
  loading?: boolean;
  propertiesLoading?: boolean;
  identifierLoading?: boolean;
}>(), {
  submitting: false,
  blueprint: () => ({} as any & Partial<IBlueprint>),
  loading: false,
  propertiesLoading: undefined,
  identifierLoading: undefined,
});
const emit = defineEmits(['submitted']);

const edit = reactive<Partial<IBlueprint>>({});
provide('edit', edit);

const blueprintMapping = ref<{ key: string; value: string }[]>([]);

function resetEditState() {
  Object.keys(edit).forEach((key) => {
    delete (edit as any)[key];
  });
}

function applyBlueprintState(blueprint: Partial<IBlueprint> = {}) {
  resetEditState();
  Object.assign(edit, {
    name: '',
    dispatchers: { create: false, delete: false, update: false },
    ...blueprint,
  });

  blueprintMapping.value = Object.entries(blueprint.updateMapping || {}).map(([key, value]) => ({
    key,
    value: String(value),
  }));
}

applyBlueprintState(props.blueprint);

watch(() => props.blueprint, (value) => {
  applyBlueprintState(value);
});

provide('submitting', toRef(props, 'submitting'));

const blueprintJson = ref('');

watch(blueprintJson, (value) => {
  try {
    const parsed = JSON.parse(value);
    Object.assign(edit, parsed);
    blueprintMapping.value = Object.entries(parsed.updateMapping || {}).map(([key, value]) => ({
      key,
      value: String(value)
    }));
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
});

watch(() => edit.name, (newName) => {
  if (newName && newName.trim()) {
    edit.identifier = getKeyFromName(newName)
  }
})

const propertiesLoadingState = computed(() => props.propertiesLoading ?? props.loading ?? false);
const identifierLoadingState = computed(() => props.identifierLoading ?? props.loading ?? false);

// Handle tab management with route query
const activeTab = computed({
  get: () => route.query.tab?.toString() || 'general',
  set: (tabName: string) => {
    router.replace({ query: { ...route.query, tab: tabName } }).catch(error => {
      console.error('Failed to update route:', error);
    });
  }
})

watch(() => activeTab.value === 'summary', (isSummary) => {
  if (isSummary) {
    blueprintJson.value = JSON.stringify(edit, null, 2);
  }
})

function submit() {
  const data = { ...edit };
  if (blueprintMapping.value) {
    data.updateMapping = blueprintMapping.value.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
  }
  emit('submitted', data)
}
</script>

<template>
  <el-form @submit.native.prevent="submit" class="blueprint-form">
    <header class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><font-awesome-icon :icon="['fas', 'cube']" /></el-icon>
        <span>{{ $t(blueprint._id ? 'Edit Blueprint' : 'Create Blueprint') }}:</span>
        <strong v-if="blueprint?.name">{{ blueprint.name }}</strong>
      </div>
      <div class="header-actions">
        <el-button type="primary" native-type="submit" :loading="props.submitting" :disabled="props.submitting">
          <el-icon><font-awesome-icon :icon="['fas', 'save']" /></el-icon>
          <span>{{ $t('Save') }}</span>
        </el-button>
      </div>
    </header>

    <div class="main-content">
      <el-tabs 
        v-model="activeTab"
        class="editor-tabs"
        type="border-card">
      <el-tab-pane name="general" lazy>
        <template #label>
          <div class="tab-label">
            <el-icon><font-awesome-icon :icon="['fas', 'info-circle']" /></el-icon>
            <span>{{ $t('General') }}</span>
          </div>
        </template>
        <div class="tab-content">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><font-awesome-icon :icon="['fas', 'info-circle']" /></el-icon>
                <span>{{ $t('General Information') }}</span>
              </div>
            </template>
            <BlueprintGeneralTab :modelValue="edit" @update:modelValue="(val) => Object.assign(edit, val)" />
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane name="rbac" lazy>
        <template #label>
          <div class="tab-label">
            <el-icon><font-awesome-icon :icon="['fas', 'user-shield']" /></el-icon>
            <span>{{ $t('Permissions and Roles') }}</span>
          </div>
        </template>
        <div class="tab-content">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><font-awesome-icon :icon="['fas', 'user-shield']" /></el-icon>
                <span>{{ $t('Permissions and Roles') }}</span>
              </div>
            </template>
            <BlueprintPermissionsTab 
            v-model:permissions="edit.permissions" 
            v-model:scope="edit.permissionScope" 
            :availableLabels="availableLabels" />
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane name="properties" lazy>
        <template #label>
          <div class="tab-label">
            <el-icon><font-awesome-icon :icon="['fas', 'list-ul']" /></el-icon>
            <span>{{ $t('Properties') }}</span>
          </div>
        </template>
        <div class="tab-content">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><font-awesome-icon :icon="['fas', 'list-ul']" /></el-icon>
                <span>{{ $t('Blueprint Properties') }}</span>
              </div>
            </template>
            <BlueprintPropertiesTab 
              v-model:properties="edit.properties" 
              v-model:entityIdentifierMechanism="edit.entityIdentifierMechanism" 
              :loading="props.loading"
              :properties-loading="propertiesLoadingState"
              :identifier-loading="identifierLoadingState"
            />
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane name="mapping" lazy>
        <template #label>
          <div class="tab-label">
            <el-icon><font-awesome-icon :icon="['fas', 'calculator']" /></el-icon>
            <span>{{ $t('On-Save Mapping') }}</span>
          </div>
        </template>
        <div class="tab-content">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><font-awesome-icon :icon="['fas', 'calculator']" /></el-icon>
                <span>{{ $t('On-Save Mapping') }}</span>
              </div>
            </template>
            <div class="card-description">
              <p>
                {{ $t('Properties can be calculated on save.') }}<br>
                {{ $t('Each property key can have JQ calculation for its final data.') }}<br>
                {{ $t('Those calculations will run on our backend, before save for each entity.') }}
              </p>
            </div>
            <div class="mapping-list">
              <div v-for="(entry, index) in blueprintMapping" :key="index" class="property-item">
                <FormRowGroup>
                  <FormInput v-model="entry.key" title="Key"/>
                  <FormInput v-model="entry.value" title="JQ Calculation"/>
                  <div class="flex-0 remove-row">
                    <RemoveButton @click="blueprintMapping.splice(blueprintMapping.indexOf(entry), 1)"/>
                  </div>
                </FormRowGroup>
              </div>
              <AddMore @click="blueprintMapping.push({ key: '', value: '' })" class="add-more-button"/>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane name="relations" lazy>
        <template #label>
          <div class="tab-label">
            <el-icon><font-awesome-icon :icon="['fas', 'link']" /></el-icon>
            <span>{{ $t('Properties Relations') }}</span>
          </div>
        </template>
        <div class="tab-content">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><font-awesome-icon :icon="['fas', 'link']" /></el-icon>
                <span>{{ $t('Properties Relations') }}</span>
              </div>
            </template>
            <div class="card-description">
              <p>
                {{ $t('Relations are the logical connection between two or more entities.') }}<br>
                {{ $t('Each relation will have a key and a target.') }}<br>
                {{ $t('The target is the entity that will be connected to the current entity.') }}
              </p>
            </div>
            <div class="relations-list">
              <div v-for="(entry, index) in edit.relations" :key="index" class="property-item">
                <FormRowGroup>
                  <FormInput v-model="entry.key" title="Key"/>
                  <BlueprintSelector title="Target Blueprint" v-model="entry.target"/>
                  <div class="flex-0 remove-row">
                    <RemoveButton @click="edit.relations.splice(edit.relations.indexOf(entry), 1)"/>
                  </div>
                </FormRowGroup>
              </div>
              <AddMore @click="edit.relations.push({ key: '', target: '' })" class="add-more-button"/>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane name="events" lazy>
        <template #label>
          <div class="tab-label">
            <el-icon><font-awesome-icon :icon="['fas', 'bell']" /></el-icon>
            <span>{{ $t('Events Emitting') }}</span>
          </div>
        </template>
        <div class="tab-content">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><font-awesome-icon :icon="['fas', 'bell']" /></el-icon>
                <span>{{ $t('Events Emitting') }}</span>
              </div>
            </template>
            <BlueprintEventsTab v-model="edit.dispatchers" />
          </el-card>
        </div>
      </el-tab-pane>
      <el-tab-pane name="limitations" lazy>
        <template #label>
          <div class="tab-label">
            <el-icon><font-awesome-icon :icon="['fas', 'lock']" /></el-icon>
            <span>{{ $t('Limitations') }}</span>
          </div>
        </template>
        <div class="tab-content">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><font-awesome-icon :icon="['fas', 'lock']" /></el-icon>
                <span>{{ $t('Limitations') }}</span>
              </div>
            </template>
            <div class="card-description">
              <p>
                {{
                  $t('Limit users to create new entities according to specific rules.')
                }}
              </p>
            </div>
            <div class="limitations-container">
              <BlueprintLimitationsInput 
                :permission-scope="edit.permissionScope" 
                :properties="edit.properties"
                v-model="edit.limitations"
              />
            </div>
          </el-card>
        </div>
      </el-tab-pane>
      <el-tab-pane name="summary" lazy>
        <template #label>
          <div class="tab-label">
            <el-icon><font-awesome-icon :icon="['fas', 'code']" /></el-icon>
            <span>{{ $t('Summary') }}</span>
          </div>
        </template>
        <div class="tab-content">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><font-awesome-icon :icon="['fas', 'code']" /></el-icon>
                <span>{{ $t('Blueprint JSON') }}</span>
              </div>
            </template>
            <div class="monaco-container">
              <Monaco 
                ref="editor" 
                v-model="blueprintJson"
                language="json"
                class="monaco-editor"
              />
            </div>
          </el-card>
        </div>
      </el-tab-pane>

    </el-tabs>
    
    <div class="footer-actions">
      <el-button type="primary" @click="submit" :loading="props.submitting" :disabled="props.submitting">
        {{ $t('Save Changes') }}
      </el-button>
    </div>
  </div>
  </el-form>
</template>

<style scoped>
.blueprint-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--el-border-color);
  padding: 1rem;
  background-color: var(--el-fill-color-light);
  border-radius: 4px 4px 0 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.page-title {
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--el-text-color-primary);
}

.page-title strong {
  color: var(--el-color-primary);
  font-weight: 600;
}

.title-icon {
  font-size: 1.25rem;
  color: var(--el-color-primary);
  margin-right: 0.25rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.main-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 120px);
  max-width: 100%;
}

.editor-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.tab-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 1rem;
}

.settings-card {
  margin-bottom: 1rem;
  transition: all 0.3s ease;
}

.settings-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
}

.card-description {
  margin-bottom: 1.5rem;
}

.property-item {
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  transition: all 0.3s;
}

.property-item:hover {
  background-color: var(--el-fill-color);
}

.add-more-button {
  margin-top: 0.5rem;
}

.monaco-container {
  height: 400px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.monaco-editor {
  height: 100%;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  border-top: 1px solid var(--el-border-color);
  margin-top: 1rem;
  background-color: var(--el-fill-color-light);
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow: auto;
}

:deep(.el-tabs__nav) {
  background-color: var(--el-fill-color-light);
}

:deep(.el-tabs__item.is-active) {
  font-weight: 600;
}

:deep(.el-tabs) {
  max-width: 100%;
  overflow: hidden;
}

:deep(.el-tabs__header) {
  margin: 0;
}

:deep(.el-tabs__nav-wrap) {
  position: relative;
  overflow: hidden;
}

:deep(.el-tabs__nav-scroll) {
  overflow: hidden;
}

:deep(.el-tabs__nav) {
  position: relative;
  display: flex;
  white-space: nowrap;
}

:deep(.el-tabs__item) {
  padding: 0 16px;
  height: 40px;
  box-sizing: border-box;
  line-height: 40px;
  flex-shrink: 0;
}

:deep(.el-tabs--border-card > .el-tabs__header) {
  background-color: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  margin: 0;
}

:deep(.el-card__body) {
  padding: 1rem;
}

h3 {
  margin-block: 10px;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

p {
  color: var(--el-text-color-secondary);
  margin-bottom: 1rem;
  line-height: 1.5;
}

.remove-row {
  margin-bottom: 5px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .tab-content {
    padding: 0.5rem;
  }
}
</style>
