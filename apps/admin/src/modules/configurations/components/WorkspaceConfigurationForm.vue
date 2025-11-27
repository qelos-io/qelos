<template>
  <div class="workspace-config-page flex-row">
    <el-form @submit.native.prevent="save" class="workspace-configuration-form flex-4">
      <section class="panel workspace-mode-panel">
        <header class="panel-header">
          <div>
            <p class="panel-eyebrow">{{ $t('Workspace Mode') }}</p>
            <h2>{{ $t('Design how accounts collaborate across workspaces') }}</h2>
            <p class="panel-description">{{ workspaceModeCopy.description }}</p>
          </div>
          <FormInput
            class="active-input"
            v-model="edited.isActive"
            title="Enable multi-workspace accounts"
            type="switch"
            description="Turn this on to let every account spin up dedicated workspaces with their own members, permissions and billing context."
          />
        </header>
        <div class="mode-pill" :class="{ 'is-b2b': edited.isActive }">
          {{ workspaceModeCopy.highlight }}
        </div>
        <ul class="mode-benefits">
          <li>{{ $t('Users can join multiple workspaces under the same account with tailored roles.') }}</li>
          <li>{{ $t('Perfect for product-led B2B plans, agencies or supplier / consumer marketplaces.') }}</li>
          <li>{{ $t('Switch off to keep the experience lean for B2C single-user journeys.') }}</li>
        </ul>
      </section>

      <section class="panel">
        <header class="panel-header compact">
          <div>
            <p class="panel-eyebrow">{{ $t('Access & Governance') }}</p>
            <h3>{{ $t('Decide who can create workspaces and see members') }}</h3>
            <p class="panel-description">{{ $t('Use granular role gates to keep workspace management safe while empowering admins.') }}</p>
          </div>
        </header>
        <FormRowGroup align-start class="dense-row">
          <el-form-item class="flex-1">
            <template #label>
              {{ $t('Roles allowed to create workspaces') }}
              <InfoIcon content="Define the minimum roles needed in order to be able to create a new workspace"/>
            </template>
            <el-select
              v-model="edited.creationPrivilegedRoles"
              multiple
              filterable
              allow-create
              default-first-option
              :reserve-keyword="false"
            >
              <el-option
                v-for="option in creationRoleOptions"
                :key="option.value"
                :label="$t(option.labelKey)"
                :value="option.value"
              />
            </el-select>
            <p class="field-hint">{{ $t('Give billing or ops teams the keys to spin up new client spaces when needed.') }}</p>
          </el-form-item>

          <el-form-item class="flex-1">
            <template #label>
              {{ $t('Workspace roles allowed to view members') }}
              <InfoIcon content="Define the minimum workspace roles needed in order view their workspace members"/>
            </template>
            <el-select
              v-model="edited.viewMembersPrivilegedWsRoles"
              multiple
              filterable
              allow-create
              default-first-option
              :reserve-keyword="false"
            >
              <el-option
                v-for="option in workspaceViewRoleOptions"
                :key="option.value"
                :label="$t(option.labelKey)"
                :value="option.value"
              />
            </el-select>
            <p class="field-hint">{{ $t('Limit sensitive roster data to trusted workspace roles.') }}</p>
          </el-form-item>
        </FormRowGroup>

        <FormRowGroup class="dense-row">
          <FormInput
            v-model="edited.allowNonWorkspaceUsers"
            title="Allow navigation without workspace"
            type="switch"
            description="Great for onboarding funnels: users explore the app first, then pick a workspace."
          />
          <FormInput
            v-model="edited.allowNonLabeledWorkspaces"
            title="Allow unlabelled workspaces"
            type="switch"
            description="Disable when every workspace must match a pricing plan or supply / consumer type."
          />
        </FormRowGroup>
      </section>

      <section class="panel labels-panel">
        <header class="panel-header">
          <div>
            <p class="panel-eyebrow">{{ $t('Labels & Plans') }}</p>
            <h3>{{ $t('Describe the workspace flavors you support') }}</h3>
            <p class="panel-description">{{ $t('Labels can behave like pricing plans or marketplace roles. Combine multiple labels to mix both concepts for the same account.') }}</p>
          </div>
          <el-button type="primary" plain class="add-label-btn" native-type="button" @click="addLabel">
            <el-icon><font-awesome-icon :icon="['fas', 'plus']" /></el-icon>
            {{ $t('Add workspace type / plan') }}
          </el-button>
        </header>

        <div v-if="!hasLabels" class="labels-empty-state">
          <p class="empty-title">{{ $t('No labels yet') }}</p>
          <p class="empty-copy">{{ $t('Create at least one label if every workspace must fit a pricing plan or marketplace persona.') }}</p>
          <el-button size="large" type="primary" plain native-type="button" @click="addLabel">
            {{ $t('Create first label') }}
          </el-button>
        </div>

        <TransitionGroup name="list" tag="div" class="labels-grid">
          <article class="label-card" v-for="(row, index) in edited.labels" :key="`label-${index}`">
            <header class="label-card-header">
              <div>
                <p class="label-card-eyebrow">{{ $t('Label') }} #{{ index + 1 }}</p>
                <h4>{{ row.title || $t('Untitled label') }}</h4>
                <p class="label-preview" v-if="row.value?.length">
                  <span v-for="chip in row.value" :key="chip" class="label-chip">{{ chip }}</span>
                </p>
              </div>
              <RemoveButton @click="removeLabel(index)"/>
            </header>
            <div class="label-card-body">
              <FormInput v-model="row.title" title="Title" type="text" placeholder="Growth plan, Supplier, Consumer"/>
              <FormInput v-model="row.description" title="Description" type="textarea" :rows="2" placeholder="Explain what this workspace type unlocks for admins and members"/>
              <LabelsInput
                title="Label values"
                v-model="row.value"
                class="wide-input"
                info="Labels to be attached to the workspace upon creation"
              >
                <el-option
                  v-for="option in labelPresetOptions"
                  :key="option"
                  :label="$t(option)"
                  :value="option"
                />
              </LabelsInput>
              <LabelsInput
                title="Creator roles"
                v-model="row.allowedRolesForCreation"
                class="wide-input"
                info="Only a user with these roles can create a workspace with this label"
              >
                <el-option
                  v-for="option in creationRoleOptions"
                  :key="`label-role-${option.value}`"
                  :label="$t(option.labelKey)"
                  :value="option.value"
                />
              </LabelsInput>
            </div>
          </article>
        </TransitionGroup>
      </section>

      <div class="form-footer">
        <SaveButton :submitting="submitting"/>
      </div>
    </el-form>
    <CreateMyWorkspace v-if="!$isMobile" class="create-ws-demo flex-2" :ws-config="edited"/>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import { WorkspaceConfigurationMetadata } from '@qelos/global-types';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import { useNotifications } from '@/modules/core/compositions/notifications';
import CreateMyWorkspace from '@/modules/workspaces/CreateMyWorkspace.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';

const labelPresetOptions = ['customer', 'supplier', 'merchant'];
const creationRoleOptions = [
  { labelKey: `* ('All')`, value: '*' },
  { labelKey: 'admin', value: 'admin' },
  { labelKey: 'user', value: 'user' }
];
const workspaceViewRoleOptions = [
  { labelKey: `* ('All')`, value: '*' },
  { labelKey: 'admin', value: 'admin' },
  { labelKey: 'member', value: 'member' },
  { labelKey: 'user', value: 'user' }
];

const props = defineProps({
  kind: String,
  metadata: Object as () => WorkspaceConfigurationMetadata,
  submitting: Boolean
})


const defaultMetadata: WorkspaceConfigurationMetadata = {
  isActive: false,
  creationPrivilegedRoles: [],
  viewMembersPrivilegedWsRoles: [],
  labels: [],
  allowNonLabeledWorkspaces: true,
  allowNonWorkspaceUsers: true
}

const edited = ref<WorkspaceConfigurationMetadata>({
  ...defaultMetadata,
  ...(props.metadata || {})
})

const emit = defineEmits(['save']);

const notifications = useNotifications();
const { t: $t } = useI18n();

const hasLabels = computed(() => !!edited.value.labels?.length);

const workspaceModeCopy = computed(() =>
  edited.value.isActive
    ? {
        highlight: $t('B2B workspace mode enabled'),
        description: $t('Every account can own multiple workspaces, members and shared billing contexts.')
      }
    : {
        highlight: $t('Single workspace (B2C) mode'),
        description: $t('Keep things simple: accounts act as individual users with one shared workspace.')
      }
);

function defaultLabel() {
  return { title: '', description: '', value: [], allowedRolesForCreation: ['*'] };
}

function addLabel() {
  edited.value.labels = [...(edited.value.labels || []), defaultLabel()];
}

function removeLabel(index: number) {
  edited.value.labels.splice(index, 1);
}


function save() {
  if (!edited.value.allowNonLabeledWorkspaces && !edited.value.labels.length) {
    notifications.error($t('At least one label must be defined'));
    return;
  }
  if (edited.value.labels.some(label => !label.title || !label.value.length)) {
    notifications.error($t('All labels must have a title and at least one value'));
    return;
  }
  emit('save', edited.value)
}
</script>
<style scoped>
.workspace-config-page {
  align-items: flex-start;
  gap: 30px;
}

.workspace-configuration-form {
  padding-inline-end: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.panel {
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  background: var(--background-color, #fff);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-block-end: 16px;
}

.panel-header.compact {
  margin-block-end: 8px;
}

.panel-eyebrow {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  margin: 0;
  font-weight: 600;
}

.panel-description {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  max-width: 560px;
}

.mode-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  font-weight: 600;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-primary);
}

.mode-pill.is-b2b {
  background: rgba(64, 158, 255, 0.15);
  color: var(--el-color-primary);
}

.mode-benefits {
  margin: 16px 0 0;
  padding-inline-start: 18px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.mode-benefits li + li {
  margin-block-start: 6px;
}

.dense-row {
  gap: 20px;
}

.field-hint {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.labels-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-label-btn {
  align-self: flex-start;
}

.labels-empty-state {
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  background: var(--el-fill-color-lighter);
}

.empty-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.empty-copy {
  margin: 8px 0 16px;
  color: var(--el-text-color-secondary);
}

.labels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.label-card {
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 18px;
  background: var(--background-color, #fff);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.label-card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.label-card-eyebrow {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  color: var(--el-text-color-secondary);
}

.label-card-header h4 {
  margin: 4px 0;
}

.label-preview {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.label-chip {
  background: var(--el-fill-color-lighter);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
}

.label-card-body {
  display: grid;
  gap: 12px;
}

.form-footer {
  position: sticky;
  inset-block-end: 0;
  padding-block: 16px;
  display: flex;
  justify-content: flex-end;
  background: linear-gradient(to top, var(--el-bg-color, #ffffff) 85%, rgba(255, 255, 255, 0));
  border-block-start: 1px solid var(--el-border-color-light, #e4e7ed);
  margin-block-start: 8px;
  z-index: 5;
  backdrop-filter: blur(6px);
}

.create-ws-demo {
  border: 4px solid var(--border-color);
  margin-inline-end: 10px;
  zoom: 0.5;
  border-radius: 24px;
  position: sticky;
  inset-block-start: 20px;
  padding: 16px;
  background: var(--background-color, #fff);
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
}

.active-input {
  min-width: 220px;
}

@media (max-width: 1024px) {
  .workspace-config-page {
    flex-direction: column;
  }

  .workspace-configuration-form {
    padding-inline-end: 0;
  }
}

@media (max-width: 600px) {
  .panel {
    padding: 18px;
  }

  .labels-grid {
    grid-template-columns: 1fr;
  }

  .active-input {
    min-width: auto;
  }
}

</style>
