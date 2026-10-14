<template>
  <div class="workspace-page">
    <el-form class="form" @submit.prevent="save">
      <ConfigCard id="ws-mode" :title="$t('Workspace mode')" :description="workspaceModeCopy.description">
        <SettingRow :title="$t('Enable multi-workspace accounts')" :description="$t('Turn this on to let every account spin up dedicated workspaces with their own members, permissions and billing context.')">
          <template #note>
            <span class="mode" :class="{ b2b: edited.isActive }">{{ workspaceModeCopy.highlight }}</span>
          </template>
          <template #default="{ labelledBy }"><el-switch v-model="edited.isActive" :aria-labelledby="labelledBy" /></template>
        </SettingRow>
      </ConfigCard>

      <ConfigCard id="ws-access" :title="$t('Access and governance')" :description="$t('Use granular role gates to keep workspace management safe while empowering admins.')">
        <div class="pair">
          <el-form-item class="field">
            <template #label>
              {{ $t('Roles allowed to create workspaces') }}
              <InfoIcon content="Define the minimum roles needed in order to be able to create a new workspace" />
            </template>
            <el-select v-model="edited.creationPrivilegedRoles" multiple filterable allow-create default-first-option :reserve-keyword="false">
              <el-option v-for="option in creationRoleOptions" :key="option.value" :label="$t(option.labelKey)" :value="option.value" />
            </el-select>
            <span class="hint">{{ $t('Give billing or ops teams the keys to spin up new client spaces when needed.') }}</span>
          </el-form-item>

          <el-form-item class="field">
            <template #label>
              {{ $t('Workspace roles allowed to view members') }}
              <InfoIcon content="Define the minimum workspace roles needed in order view their workspace members" />
            </template>
            <el-select v-model="edited.viewMembersPrivilegedWsRoles" multiple filterable allow-create default-first-option :reserve-keyword="false">
              <el-option v-for="option in workspaceViewRoleOptions" :key="option.value" :label="$t(option.labelKey)" :value="option.value" />
            </el-select>
            <span class="hint">{{ $t('Limit sensitive roster data to trusted workspace roles.') }}</span>
          </el-form-item>
        </div>

        <SettingRow :title="$t('Allow navigation without workspace')" :description="$t('Great for onboarding funnels: users explore the app first, then pick a workspace.')">
          <template #default="{ labelledBy }"><el-switch v-model="edited.allowNonWorkspaceUsers" :aria-labelledby="labelledBy" /></template>
        </SettingRow>
        <SettingRow :title="$t('Allow unlabelled workspaces')" :description="$t('Disable when every workspace must match a pricing plan or supply / consumer type.')">
          <template #default="{ labelledBy }"><el-switch v-model="edited.allowNonLabeledWorkspaces" :aria-labelledby="labelledBy" /></template>
        </SettingRow>
      </ConfigCard>

      <ConfigCard id="ws-labels" :title="$t('Labels and plans')" :description="$t('Labels can behave like pricing plans or marketplace roles. Combine multiple labels to mix both concepts for the same account.')">
        <template #actions>
          <el-button type="primary" plain native-type="button" @click="addLabel"><el-icon><Plus /></el-icon>{{ $t('Add workspace type / plan') }}</el-button>
        </template>

        <div v-if="!hasLabels" class="empty">
          <strong>{{ $t('No labels yet') }}</strong>
          <span>{{ $t('Create at least one label if every workspace must fit a pricing plan or marketplace persona.') }}</span>
          <div><el-button type="primary" plain native-type="button" @click="addLabel">{{ $t('Create first label') }}</el-button></div>
        </div>

        <ul v-else class="labels">
          <li v-for="(row, index) in edited.labels" :key="`label-${index}`" class="label">
            <header class="label-head">
              <span class="number" aria-hidden="true">{{ index + 1 }}</span>
              <span class="label-title" dir="auto">{{ row.title || $t('Untitled label') }}</span>
              <el-button text circle type="danger" native-type="button" :aria-label="`${$t('Remove')}: ${row.title || index + 1}`" @click="removeLabel(index)"><el-icon><Delete /></el-icon></el-button>
            </header>
            <div class="label-grid">
              <FormInput v-model="row.title" title="Title" type="text" placeholder="Growth plan, Supplier, Consumer" />
              <LabelsInput title="Label values" v-model="row.value" info="Labels to be attached to the workspace upon creation">
                <el-option v-for="option in labelPresetOptions" :key="option" :label="$t(option)" :value="option" />
              </LabelsInput>
              <FormInput class="full" v-model="row.description" title="Description" type="textarea" :rows="2" placeholder="Explain what this workspace type unlocks for admins and members" />
              <LabelsInput class="full" title="Creator roles" v-model="row.allowedRolesForCreation" info="Only a user with these roles can create a workspace with this label">
                <el-option v-for="option in creationRoleOptions" :key="`label-role-${option.value}`" :label="$t(option.labelKey)" :value="option.value" />
              </LabelsInput>
            </div>
          </li>
        </ul>
      </ConfigCard>
    </el-form>

    <aside v-if="showDemo" class="demo" :aria-label="$t('Live Preview')">
      <CreateMyWorkspace :ws-config="edited" />
    </aside>
  </div>
</template>

<script lang="ts" setup>
import { useConfigDraft } from '../compositions/config-shell';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { WorkspaceConfigurationMetadata } from '@qelos/global-types';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import ConfigCard from './ConfigCard.vue';
import SettingRow from './SettingRow.vue';
import { useViewport } from '@/modules/core/compositions/viewport';
import { Delete, Plus } from '@element-plus/icons-vue';
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
const { width } = useViewport();
const showDemo = computed(() => width.value >= 1100);
useConfigDraft(edited);

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
<style scoped lang="scss">
.workspace-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 20px;
}

@media (min-width: 1100px) {
  .workspace-page {
    grid-template-columns: minmax(0, 1fr) 380px;
  }
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-inline-size: 0;
}

.demo {
  position: sticky;
  inset-block-start: 16px;
  min-inline-size: 0;
  max-block-size: calc(100vh - 160px);
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
  zoom: 0.8;
}

.mode {
  align-self: flex-start;
  margin-block-start: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--el-fill-color);
  color: var(--el-text-color-regular);
  font-size: 0.8rem;
  font-weight: 600;

  &.b2b {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}

.pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0 16px;
}

.field {
  margin: 0 0 8px;
}

.hint {
  display: block;
  margin-block-start: 4px;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  line-height: 1.4;
}

.empty {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  color: var(--el-text-color-secondary);
  text-align: start;

  strong {
    color: var(--el-text-color-primary);
  }
}

.labels {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.label {
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
}

.label-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-block-end: 8px;
}

.number {
  display: grid;
  flex: none;
  place-items: center;
  inline-size: 24px;
  block-size: 24px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 0.8rem;
  font-weight: 700;
}

.label-title {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.label-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;

  .full {
    grid-column: 1 / -1;
  }
}

@media (max-width: 639px) {
  .label-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
