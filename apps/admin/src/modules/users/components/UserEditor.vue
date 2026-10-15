<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, CopyDocument, Delete, Key, Refresh, User } from '@element-plus/icons-vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import EntityBillingPanel from '@/modules/pricing-plans/components/EntityBillingPanel.vue';
import { subscriptionRoute } from '@/modules/pricing-plans/services/entity-links';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { authStore, isAdmin } from '@/modules/core/store/auth';
import type { IUser } from '@/modules/core/store/types/user';
import { useImpersonation, useRemoveUser } from '../compositions/users';
import { getUserDisplayName } from '../services/display-name';
import { buildPayload, draftFromUser, firstErrorSection, generatePassword, validateUser, type UserErrors, type UserMode, type UserSection } from '../services/user-draft';
import { isJustNow, lastSeen, relativeTime, roleTagType } from '../services/user-presentation';
import AvatarField from './AvatarField.vue';
import UserAvatar from './UserAvatar.vue';

const props = defineProps<{
  user?: IUser;
  mode: UserMode;
  submitting?: boolean;
  /** persists the changes; resolves with a truthy value when saved */
  save: (payload: Record<string, unknown>) => Promise<unknown>;
}>();

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const wsConfig = useWsConfiguration();
const impersonate = useImpersonation();
const { remove } = useRemoveUser(() => router.push({ name: 'users' }));

const draft = reactive(draftFromUser(props.user));
const snapshot = () => JSON.stringify(draft);
const baseline = ref(snapshot());
let baselineDraft = JSON.parse(baseline.value);
const dirty = computed(() => snapshot() !== baseline.value);
const errors = ref<UserErrors>({});
const showErrors = ref(false);
const justSaved = ref(false);
let savedTimer: ReturnType<typeof setTimeout> | undefined;

const isSelf = computed(() => props.mode === 'self');
const isCreate = computed(() => props.mode === 'create');
const displayName = computed(() => {
  const fromDraft = `${draft.firstName} ${draft.lastName}`.trim();
  return fromDraft || (props.user ? getUserDisplayName(props.user) : '') || draft.username || t('New user');
});

const sections = computed<{ key: UserSection; label: string }[]>(() => {
  if (isSelf.value) return [];
  const list: { key: UserSection; label: string }[] = [
    { key: 'profile', label: t('Profile') },
    { key: 'access', label: t('Access') },
  ];
  if (props.mode === 'edit' && wsConfig.loaded && !wsConfig.isActive && props.user?._id) list.push({ key: 'billing', label: t('Billing') });
  list.push({ key: 'advanced', label: t('Advanced') });
  return list;
});

const section = computed<UserSection>({
  get: () => {
    const value = route.query.section?.toString() as UserSection;
    return isSelf.value ? 'profile' : sections.value.some((s) => s.key === value) ? value : 'profile';
  },
  set: (value) => {
    router.replace({ query: { ...route.query, section: value } });
  },
});

const KNOWN_ROLES = ['admin', 'editor', 'plugin', 'user'];
const roleOptions = computed(() => [...new Set([...KNOWN_ROLES, ...(props.user?.roles || []), ...draft.roles])]);

watch(draft, () => {
  if (showErrors.value) errors.value = validateUser(draft, props.mode);
});

const changingPassword = ref(false);
const passwordVisible = computed(() => isCreate.value || changingPassword.value);
function suggestPassword() {
  draft.password = generatePassword();
  changingPassword.value = true;
}
async function copyPassword() {
  try {
    await navigator.clipboard.writeText(draft.password);
    ElMessage.success(t('Copied'));
  } catch {
    ElMessage.warning(t('Could not copy'));
  }
}
function cancelPassword() {
  draft.password = '';
  changingPassword.value = false;
}

async function submit(): Promise<boolean> {
  if (props.submitting) return false;
  errors.value = validateUser(draft, props.mode);
  showErrors.value = true;
  const failing = firstErrorSection(errors.value, sections.value.map((s) => s.key));
  if (Object.keys(errors.value).length) {
    if (failing) section.value = failing;
    ElMessage.error(t('Please correct the form errors before submitting'));
    return false;
  }
  const payload = buildPayload(draft, isCreate.value ? undefined : baselineDraft, props.mode);
  if (!Object.keys(payload).length) return true;
  const result = await props.save(payload);
  if (!result) return false;
  draft.password = '';
  changingPassword.value = false;
  baseline.value = snapshot();
  baselineDraft = JSON.parse(baseline.value);
  showErrors.value = false;
  justSaved.value = true;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (justSaved.value = false), 2500);
  return true;
}

function discard() {
  Object.assign(draft, JSON.parse(baseline.value));
  changingPassword.value = false;
  errors.value = {};
  showErrors.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    submit();
  }
}
const warnUnload = (event: BeforeUnloadEvent) => {
  if (dirty.value) event.preventDefault();
};
onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('beforeunload', warnUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('beforeunload', warnUnload);
  clearTimeout(savedTimer);
});
onBeforeRouteLeave(async () => {
  if (!dirty.value || props.submitting) return true;
  try {
    await ElMessageBox.confirm(t('You have unsaved changes. Leave without saving?'), t('Unsaved changes'), { type: 'warning', confirmButtonText: t('Leave'), cancelButtonText: t('Stay') });
    return true;
  } catch {
    return false;
  }
});

const seen = computed(() => {
  const date = props.user ? lastSeen(props.user as any) : null;
  if (!date) return '';
  return isJustNow(date) ? t('Signed in just now') : t('Signed in {time}', { time: relativeTime(date, new Date(), locale.value) });
});
const canImpersonate = computed(() => isAdmin.value && props.mode === 'edit' && !!props.user && authStore.user?._id !== props.user._id);
const isMe = computed(() => !!props.user && authStore.user?._id === props.user._id);
</script>

<template>
  <div class="editor" :class="{ self: isSelf }">
    <header v-if="!isSelf" class="head">
      <el-button text class="back" @click="router.push({ name: 'users' })"><el-icon class="dir-icon"><ArrowLeft /></el-icon><span>{{ $t('Users') }}</span></el-button>
      <div class="identity">
        <UserAvatar :name="displayName" :src="draft.profileImage" :size="56" />
        <div class="who">
          <h1 dir="auto">{{ displayName }}</h1>
          <p v-if="user" class="meta">
            <span dir="ltr">{{ user.username }}</span>
            <el-tag v-if="user.emailVerified" size="small" type="success" effect="plain">{{ $t('Email verified') }}</el-tag>
            <span>{{ seen || $t('Never signed in') }}</span>
          </p>
          <p v-else class="meta">{{ $t('Create a person who can sign in to your app.') }}</p>
        </div>
        <div v-if="user" class="roles">
          <el-tag v-for="role in user.roles" :key="role" size="small" :type="roleTagType(role)" effect="light">{{ role }}</el-tag>
        </div>
        <div v-if="mode === 'edit' && user" class="actions">
          <el-button v-if="canImpersonate" :icon="User" @click="impersonate(user)">{{ $t('Sign in as this user') }}</el-button>
          <el-button v-if="!isMe" :icon="Delete" type="danger" plain @click="remove(user)">{{ $t('Remove') }}</el-button>
        </div>
      </div>
    </header>

    <div class="layout">
      <nav v-if="sections.length > 1" class="rail" :aria-label="$t('User sections')">
        <button v-for="item in sections" :key="item.key" type="button" class="rail-item" :class="{ on: section === item.key, bad: showErrors && firstErrorSection(errors, [item.key]) }" :aria-current="section === item.key ? 'page' : undefined" @click="section = item.key">{{ item.label }}</button>
      </nav>

      <main class="panel">
        <el-form v-if="section === 'profile'" label-position="top" class="form" @submit.prevent="submit">
          <el-form-item :label="$t('Photo')"><AvatarField v-model="draft.profileImage" :name="displayName" /></el-form-item>
          <div class="two">
            <el-form-item :label="$t('First name')" :error="errors.firstName ? $t(errors.firstName) : undefined"><el-input v-model="draft.firstName" dir="auto" autocomplete="given-name" /></el-form-item>
            <el-form-item :label="$t('Last name')" :error="errors.lastName ? $t(errors.lastName) : undefined"><el-input v-model="draft.lastName" dir="auto" autocomplete="family-name" /></el-form-item>
          </div>
          <el-form-item :label="$t('Email')" :error="errors.username ? $t(errors.username) : undefined">
            <el-input v-model="draft.username" dir="ltr" type="email" :disabled="isSelf" autocomplete="off" />
            <p v-if="isSelf" class="hint">{{ $t('Your email is how you sign in. Ask an admin to change it.') }}</p>
          </el-form-item>
          <template v-if="isSelf">
            <el-form-item :label="$t('Password')" :error="errors.password ? $t(errors.password) : undefined">
              <template v-if="!passwordVisible"><el-button :icon="Key" @click="changingPassword = true">{{ $t('Change password') }}</el-button></template>
              <template v-else>
                <el-input v-model="draft.password" type="password" show-password autocomplete="new-password" :placeholder="$t('New password')" />
                <el-button text class="inline" @click="cancelPassword">{{ $t('Cancel') }}</el-button>
              </template>
            </el-form-item>
          </template>
        </el-form>

        <el-form v-else-if="section === 'access'" label-position="top" class="form" @submit.prevent="submit">
          <el-form-item :label="$t('Roles')" :error="errors.roles ? $t(errors.roles) : undefined">
            <el-select v-model="draft.roles" multiple filterable allow-create default-first-option :reserve-keyword="false" :placeholder="$t('Choose or type a role')">
              <el-option v-for="role in roleOptions" :key="role" :value="role" :label="role" />
            </el-select>
            <p class="hint">{{ $t('Roles decide which pages and features the user can reach.') }}</p>
          </el-form-item>
          <el-form-item :label="$t('Password')" :error="errors.password ? $t(errors.password) : undefined">
            <template v-if="!passwordVisible">
              <el-button :icon="Key" @click="changingPassword = true">{{ $t('Set a new password') }}</el-button>
              <p class="hint">{{ $t('The current password stays unless you set a new one.') }}</p>
            </template>
            <template v-else>
              <div class="password-row">
                <el-input v-model="draft.password" type="text" dir="ltr" autocomplete="new-password" :placeholder="isCreate ? $t('At least 8 characters') : $t('New password')" />
                <el-button :icon="Refresh" @click="suggestPassword">{{ $t('Generate') }}</el-button>
                <el-button :icon="CopyDocument" :disabled="!draft.password" :aria-label="$t('Copy password')" @click="copyPassword" />
                <el-button v-if="!isCreate" text @click="cancelPassword">{{ $t('Cancel') }}</el-button>
              </div>
              <p class="hint">{{ $t('Share it with the user safely; it is not shown again after saving.') }}</p>
            </template>
          </el-form-item>
        </el-form>

        <section v-else-if="section === 'billing' && user" class="billing">
          <div class="billing-head">
            <h2>{{ $t('Billing') }}</h2>
            <router-link :to="subscriptionRoute('user', user._id)">{{ $t('View in Subscribers') }} →</router-link>
          </div>
          <EntityBillingPanel billable-entity-type="user" :billable-entity-id="user._id" />
        </section>

        <section v-else class="advanced">
          <h2>{{ $t('Internal metadata') }}</h2>
          <p class="hint">{{ $t('Notes about this user as JSON. Only admins see them.') }}</p>
          <Monaco v-model="draft.internalMetadata" language="json" height="280px" />
          <p v-if="errors.internalMetadata" class="error" role="alert">{{ $t(errors.internalMetadata) }}</p>
        </section>
      </main>
    </div>

    <div v-if="section !== 'billing'" class="savebar" :class="{ dirty }" role="region" :aria-label="$t('Save changes')">
      <p class="state" role="status">
        <template v-if="dirty"><span class="dot" aria-hidden="true" />{{ $t('Unsaved changes') }}</template>
        <template v-else-if="justSaved"><font-awesome-icon :icon="['fas', 'check']" class="ok" aria-hidden="true" />{{ $t('All changes saved') }}</template>
        <template v-else-if="isCreate">{{ $t('Not created yet') }}</template>
        <template v-else>{{ $t('No changes yet') }}</template>
      </p>
      <el-button :disabled="!dirty || submitting" @click="discard">{{ $t('Discard') }}</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!dirty && !isCreate" @click="submit">{{ isCreate ? $t('Create user') : $t('Save changes') }}</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor {
  display: flex;
  flex-direction: column;
  min-block-size: 100%;

  &.self .layout {
    padding-inline: 0;
  }

  /* inside the profile page the save buttons follow the form instead of sticking to the screen */
  &.self .savebar {
    position: static;
    padding-inline: 0;
    border-block-start: 0;
    background: transparent;
    box-shadow: none;
  }
}

.head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 20px 8px;
}

.back {
  margin-inline-start: -10px;
  padding-inline: 10px;
  gap: 4px;
  color: var(--el-text-color-secondary);
}

.identity {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  inline-size: 100%;
}

.who {
  min-inline-size: 0;

  h1 {
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-size: 1.5rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 2px 0 0;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.roles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-inline-start: auto;
}

.layout {
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: 24px;
  padding: 8px 20px 24px;
}

.rail {
  position: sticky;
  inset-block-start: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 0 0 200px;
}

.rail-item {
  padding: 9px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.on {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 600;
  }

  &.bad::after {
    content: '•';
    margin-inline-start: 6px;
    color: var(--el-color-danger);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.panel {
  flex: 1;
  min-inline-size: 0;
  max-inline-size: 720px;
}

.form {
  display: flex;
  flex-direction: column;

  /* room for the error line under a field before the next label */
  :deep(.el-form-item) {
    margin-block-end: 26px;
  }
}

.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.hint {
  inline-size: 100%;
  margin: 4px 0 0;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  text-align: start;
}

.error {
  margin: 6px 0 0;
  color: var(--el-color-danger);
  font-size: 0.85rem;
}

.password-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  inline-size: 100%;

  .el-input {
    flex: 1;
    min-inline-size: 200px;
  }
}

.inline {
  margin-inline-start: 8px;
}

.billing-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-block-end: 12px;

  h2 {
    margin: 0;
    padding: 0;
    font-size: 1.15rem;
  }

  a {
    color: var(--el-color-primary);
    font-size: 0.9rem;
    text-decoration: none;
  }
}

.advanced {
  h2 {
    margin: 0;
    padding: 0;
    font-size: 1.15rem;
  }

  .hint {
    margin: 4px 0 12px;
  }

  :deep(.monaco-editor),
  :deep(.monaco-editor .overflow-guard) {
    border-radius: 8px;
  }
}

.savebar {
  position: sticky;
  inset-block-end: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  border-block-start: 1px solid var(--el-border-color-lighter);
  background: var(--surface, var(--el-bg-color));
  box-shadow: 0 -6px 16px rgb(0 0 0 / 0.06);
}

.state {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.dirty .state {
  color: var(--el-text-color-primary);
}

.dot {
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: var(--el-color-warning);
}

.ok {
  color: var(--el-color-success);
}

[dir='rtl'] .dir-icon {
  transform: scaleX(-1);
}

@media (max-width: 800px) {
  .layout {
    flex-direction: column;
    gap: 12px;
    padding-inline: 14px;
  }

  .head {
    padding-inline: 14px;
  }

  .rail {
    position: static;
    flex-direction: row;
    flex-basis: auto;
    inline-size: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .rail-item {
    flex-shrink: 0;
    white-space: nowrap;
  }

  .two {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .actions {
    margin-inline-start: 0;
  }

  .savebar {
    padding-inline: 14px;
  }
}
</style>
