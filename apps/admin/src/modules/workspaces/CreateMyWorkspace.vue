<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Delete, Plus } from '@element-plus/icons-vue';
import type { WorkspaceConfigurationMetadata, WorkspaceLabelDefinition } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { useAuth } from '@/modules/core/compositions/authentication';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import useWorkspacesList from './store/workspaces-list';
import { useCreateWorkspace } from './compositions/workspaces';
import WorkspaceAvatar from './components/WorkspaceAvatar.vue';
import { cleanInvites } from './services/workspace-presentation';

const props = defineProps<{ wsConfig?: WorkspaceConfigurationMetadata }>();

const { t } = useI18n();
const router = useRouter();
const { user } = useAuth();
const wsStore = useWsConfiguration();
const store = useWorkspacesList();
const { createWorkspace, submitting } = useCreateWorkspace();

const config = computed(() => props.wsConfig || wsStore.metadata);

// the workspace types this user may start (definitions limited to some roles are hidden from the others)
const types = computed<WorkspaceLabelDefinition[]>(() =>
  (config.value.labels || []).filter(
    (label) => !label.allowedRolesForCreation || label.allowedRolesForCreation.includes('*') || label.allowedRolesForCreation.some((role) => user.value?.roles?.includes(role)),
  ),
);

const form = reactive({ name: '', logo: '' });
const type = ref<WorkspaceLabelDefinition | undefined>(types.value[0]);
const invites = ref<Array<{ name: string; email: string }>>([]);
const invitesOpen = ref(false);
const errors = reactive<{ name?: string; type?: string }>({});

const addInvite = () => invites.value.push({ name: '', email: '' });

async function submit() {
  errors.name = form.name.trim() ? undefined : t('Workspace name is required');
  let labels: string[] = [];
  if (types.value.length === 1) labels = types.value[0].value;
  else if (type.value) labels = type.value.value;
  errors.type = !labels.length && !config.value.allowNonLabeledWorkspaces && types.value.length ? t('Please select a workspace type') : undefined;
  if (errors.name || errors.type) return;

  const payload: Record<string, unknown> = { name: form.name.trim() };
  if (config.value.allowLogo && form.logo) payload.logo = form.logo;
  if (labels.length) payload.labels = labels;
  const valid = cleanInvites(invites.value);
  if (valid.length) payload.invites = valid;

  const created = await createWorkspace(payload);
  if (!created) return;
  store.reload();
  await store.activateSilently(created);
  // someone with no workspace so far lands on the app's home; everyone else on the new workspace
  if (store.workspaces.length === 0) await router.push({ name: 'qelos-home' });
  else {
    ElMessage.success(t('Workspace created successfully'));
    await router.push({ name: 'editMyWorkspace', params: { id: created._id } });
  }
}
</script>

<template>
  <div v-if="wsStore.loaded" class="page">
    <header class="head">
      <WorkspaceAvatar :name="form.name || '+'" :size="56" />
      <div>
        <h1>{{ $t('Create your workspace') }}</h1>
        <p>{{ $t('A place for your team, its people and its data.') }}</p>
      </div>
    </header>

    <el-form label-position="top" class="form" @submit.prevent="submit">
      <el-form-item :label="$t('Workspace name')" :error="errors.name">
        <el-input v-model="form.name" dir="auto" maxlength="120" :placeholder="$t('Enter workspace name')" autofocus />
      </el-form-item>

      <el-form-item v-if="config.allowLogo" :label="$t('Logo')">
        <FormInput v-model="form.logo" type="upload" :upload-config="{ isImage: true }" />
      </el-form-item>

      <fieldset v-if="types.length > 1" class="types">
        <legend>{{ $t(config.labelsSelectorTitle || 'Select your workspace type') }}</legend>
        <div class="grid" role="radiogroup">
          <button v-for="option in types" :key="option.value.join()" type="button" role="radio" class="type" :class="{ on: type === option }" :aria-checked="type === option" @click="type = option">
            <font-awesome-icon :icon="['fas', option.icon || 'building']" class="icon" />
            <strong dir="auto">{{ option.title }}</strong>
            <span v-if="option.description" dir="auto">{{ option.description }}</span>
          </button>
        </div>
        <p v-if="errors.type" class="error" role="alert">{{ errors.type }}</p>
      </fieldset>

      <section class="invites">
        <button type="button" class="invites-toggle" :aria-expanded="invitesOpen" @click="invitesOpen = !invitesOpen; if (invitesOpen && !invites.length) addInvite()">
          {{ $t('Invite people') }} <span>{{ $t('optional') }}</span>
        </button>
        <div v-if="invitesOpen">
          <ul>
            <li v-for="(invite, index) in invites" :key="index">
              <el-input v-model="invite.name" dir="auto" :placeholder="$t('Name')" :aria-label="$t('Name')" />
              <el-input v-model="invite.email" dir="ltr" type="email" :placeholder="$t('Email')" :aria-label="$t('Email')" />
              <el-button text circle :icon="Delete" :aria-label="$t('Remove')" @click="invites.splice(index, 1)" />
            </li>
          </ul>
          <el-button :icon="Plus" @click="addInvite">{{ $t('Add another') }}</el-button>
        </div>
      </section>

      <div class="actions">
        <el-button @click="router.back()">{{ $t('Cancel') }}</el-button>
        <el-button type="primary" native-type="submit" :loading="submitting">{{ $t('Create workspace') }}</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped lang="scss">
.page {
  max-inline-size: 640px;
  margin-inline: auto;
  padding: 24px 20px;
}

.head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-block-end: 24px;

  h1 {
    margin: 0;
    padding: 0;
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.25;
    text-align: start;
  }

  p {
    margin: 2px 0 0;
    padding: 0;
    color: var(--el-text-color-secondary);
    text-align: start;
  }
}

.form :deep(.el-form-item) {
  margin-block-end: 26px;
}

.types {
  min-inline-size: 0;
  margin: 0 0 24px;
  padding: 0;
  border: 0;

  legend {
    padding: 0 0 8px;
    font-weight: 600;
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.type {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  .icon {
    color: var(--el-color-primary);
  }

  span {
    color: var(--el-text-color-secondary);
    font-size: 0.85rem;
  }

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &.on {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.error {
  margin: 6px 0 0;
  color: var(--el-color-danger);
  font-size: 0.85rem;
}

.invites {
  margin-block-end: 24px;

  ul {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0 0 8px;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: 1fr 1.3fr auto;
    align-items: center;
    gap: 8px;
  }
}

.invites-toggle {
  margin-block-end: 8px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  span {
    margin-inline-start: 6px;
    color: var(--el-text-color-placeholder);
    font-weight: 400;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
    border-radius: 6px;
  }
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 640px) {
  .page {
    padding-inline: 14px;
  }

  .invites li {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'name remove' 'email email';

    > :nth-child(1) { grid-area: name; }
    > :nth-child(2) { grid-area: email; }
    > :nth-child(3) { grid-area: remove; }
  }
}

@media (prefers-reduced-motion: reduce) {
  .type {
    transition: none;
  }
}
</style>
