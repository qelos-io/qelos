<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ArrowDown, ArrowRight, Check, Delete, Edit, MoreFilled, User } from '@element-plus/icons-vue';
import type { IUser } from '@/modules/core/store/types/user';
import { authStore, isAdmin } from '@/modules/core/store/auth';
import { useImpersonation, useRemoveUser } from '../compositions/users';
import { getUserDisplayName } from '../services/display-name';
import { isJustNow, lastSeen, relativeTime, roleTagType } from '../services/user-presentation';
import UserAvatar from './UserAvatar.vue';

const props = defineProps<{ people: IUser[]; services: IUser[]; loading?: boolean; filtered?: boolean }>();
const emit = defineEmits<{ (e: 'removed', id: string): void; (e: 'create'): void }>();

const { locale, t } = useI18n();
const { remove } = useRemoveUser((id) => emit('removed', id));
const impersonate = useImpersonation();

const PAGE_SIZE = 25;
const page = ref(1);
const servicesOpen = ref(false);
const pageOfPeople = computed(() => props.people.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));
watch(() => props.people, () => (page.value = 1));

const seen = (user: IUser) => {
  const date = lastSeen(user as any);
  if (!date) return '';
  return isJustNow(date) ? t('Signed in just now') : t('Signed in {time}', { time: relativeTime(date, new Date(), locale.value) });
};
const canImpersonate = (user: IUser) => isAdmin.value && authStore.user?._id !== user._id;
const command = (user: IUser, name: string) => (name === 'impersonate' ? impersonate(user) : remove(user));
</script>

<template>
  <div class="list">
    <ul v-if="loading" class="rows" aria-hidden="true">
      <li v-for="i in 5" :key="i" class="row skeleton"><el-skeleton animated><template #template><el-skeleton-item variant="text" style="inline-size: 40%" /></template></el-skeleton></li>
    </ul>

    <div v-else-if="!people.length && !services.length" class="empty">
      <el-empty :description="filtered ? $t('No user matches your search') : $t('No users yet')">
        <el-button v-if="!filtered" type="primary" @click="$emit('create')">{{ $t('Create user') }}</el-button>
      </el-empty>
    </div>

    <template v-else>
      <ul class="rows">
        <li v-for="user in pageOfPeople" :key="user._id" class="row" @click="$router.push({ name: 'editUser', params: { userId: user._id } })">
          <UserAvatar :name="getUserDisplayName(user)" :src="user.profileImage" :size="40" />
          <div class="who">
            <router-link class="name" dir="auto" :to="{ name: 'editUser', params: { userId: user._id } }" @click.stop>{{ getUserDisplayName(user) }}</router-link>
            <span class="email" dir="ltr">{{ user.username }}</span>
          </div>
          <div class="roles">
            <el-tag v-for="role in user.roles" :key="role" size="small" :type="roleTagType(role)" effect="light">{{ role }}</el-tag>
          </div>
          <div class="signin">
            <el-tooltip v-if="user.emailVerified" :content="$t('Email verified')" placement="top"><el-icon class="ok"><Check /></el-icon></el-tooltip>
            <font-awesome-icon v-for="icon in user.socialLogins || []" :key="icon" :icon="['fab', icon]" class="social" :title="icon" />
          </div>
          <span class="seen" :class="{ never: !seen(user) }">{{ seen(user) || $t('Never signed in') }}</span>
          <el-dropdown trigger="click" @command="(name: string) => command(user, name)" @click.stop>
            <el-button text circle :aria-label="`${$t('Actions')}: ${getUserDisplayName(user)}`" @click.stop><el-icon><MoreFilled /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="Edit" @click="$router.push({ name: 'editUser', params: { userId: user._id } })">{{ $t('Edit') }}</el-dropdown-item>
                <el-dropdown-item v-if="canImpersonate(user)" command="impersonate" :icon="User">{{ $t('Sign in as this user') }}</el-dropdown-item>
                <el-dropdown-item command="remove" :icon="Delete" divided>{{ $t('Remove user') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </li>
      </ul>

      <el-pagination v-if="people.length > PAGE_SIZE" v-model:current-page="page" class="pager" :page-size="PAGE_SIZE" :total="people.length" layout="prev, pager, next" />

      <section v-if="services.length" class="services">
        <button type="button" class="services-toggle" :aria-expanded="servicesOpen" @click="servicesOpen = !servicesOpen">
          <el-icon class="chev"><component :is="servicesOpen ? ArrowDown : ArrowRight" /></el-icon>
          {{ $t('Service accounts') }} <span class="count">{{ services.length }}</span>
          <span class="hint">{{ $t('Used by plugins to sign in') }}</span>
        </button>
        <ul v-if="servicesOpen" class="rows">
          <li v-for="user in services" :key="user._id" class="row service" @click="$router.push({ name: 'editUser', params: { userId: user._id } })">
            <UserAvatar :name="getUserDisplayName(user)" :src="user.profileImage" :size="32" />
            <div class="who">
              <router-link class="name" dir="auto" :to="{ name: 'editUser', params: { userId: user._id } }" @click.stop>{{ getUserDisplayName(user) }}</router-link>
            </div>
            <div class="roles"><el-tag v-for="role in user.roles" :key="role" size="small" :type="roleTagType(role)" effect="light">{{ role }}</el-tag></div>
            <el-button text circle :icon="Delete" :aria-label="`${$t('Remove user')}: ${getUserDisplayName(user)}`" @click.stop="remove(user)" />
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: auto minmax(0, 1.4fr) minmax(0, 1.2fr) auto minmax(110px, auto) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--surface, var(--el-bg-color));
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: var(--el-border-color);
  }

  &:focus-within {
    border-color: var(--el-color-primary);
  }

  &.skeleton {
    min-block-size: 62px;
    cursor: default;
  }

  &.service {
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    padding-block: 6px;
  }
}

.who {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.name {
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-weight: 600;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: var(--el-color-primary);
  }
}

.email {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  text-align: start;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.roles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.signin {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
}

.ok {
  color: var(--el-color-success);
}

.seen {
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;

  &.never {
    color: var(--el-text-color-placeholder);
  }
}

.pager {
  justify-content: center;
  margin-block-start: 16px;
}

.services {
  margin-block-start: 20px;
}

.services-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-block-end: 8px;
  padding: 4px 2px;
  border: 0;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
    border-radius: 6px;
  }

  .count {
    padding: 0 8px;
    border-radius: 999px;
    background: var(--el-fill-color);
    font-size: 0.78rem;
    font-weight: 500;
  }

  .hint {
    color: var(--el-text-color-placeholder);
    font-size: 0.82rem;
    font-weight: 400;
  }
}

@media (max-width: 900px) {
  .row {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas: 'avatar who menu' '. roles roles' '. seen seen';
    row-gap: 6px;

    > :nth-child(1) { grid-area: avatar; }
    > .who { grid-area: who; }
    > .roles { grid-area: roles; }
    > .signin { display: none; }
    > .seen { grid-area: seen; }
    > :last-child { grid-area: menu; }

    :deep(.el-button.is-circle) {
      inline-size: 40px;
      block-size: 40px;
    }

    &.service {
      grid-template-areas: 'avatar who menu';
      row-gap: 0;

      > .roles { display: none; }
    }
  }

  .services-toggle .hint {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .row {
    transition: none;
  }
}
</style>
