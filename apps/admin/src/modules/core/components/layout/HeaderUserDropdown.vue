<template>
  <el-dropdown class="user-dropdown" trigger="click" @click.stop>
    <div class="el-dropdown-link user-welcome" @click.stop>
      <span>{{ user.firstName }}</span>
      <el-avatar class="avatar-img" v-if="user.workspace || user.profileImage" :src="user.profileImage">
        {{ workspaceName }}
      </el-avatar>
      <el-icon>
        <icon-arrow-down/>
      </el-icon>
    </div>
    <template #dropdown>
      <el-dropdown-menu @click.stop>
        <HeaderUserWorkspacesSelection v-if="wsConfig.isActive"/>
        <el-dropdown-item @click.stop>
          <router-link :to="{name: 'updateProfile'}" @click.stop>{{ $t('Update profile') }}</router-link>
        </el-dropdown-item>
        <el-dropdown-item
            v-if="isAdmin"
            class="privileged-toggle"
            @click.stop
        >
          <div class="privileged-toggle__row">
            <div class="privileged-toggle__copy">
              <p class="label">{{ $t('Data scope') }}</p>
              <p class="hint">{{ $t('Choose what your SDK pulls') }}</p>
              <el-tag size="small" effect="plain" class="privileged-toggle__tag">{{ $t('Admin only') }}</el-tag>
            </div>
            <el-switch
                v-model="isLoadingDataAsUser"
                :active-text="$t('Act as user')"
                :inactive-text="$t('See all data')"
                :active-value="true"
                :inactive-value="false"
                inline-prompt
                size="large"
                class="privileged-toggle__switch"
                @click.stop
            />
          </div>
        </el-dropdown-item>
        <el-dropdown-item v-if="isAdmin" class="privileged-toggle" id="edit-mode-toggle" @click.stop>
          <div class="privileged-toggle__row">
            <div class="privileged-toggle__copy">
              <p class="label">{{ $t('Manager mode') }}</p>
              <p class="hint">{{ $t('Enable layout editing tools') }}</p>
              <el-tag size="small" effect="plain" class="privileged-toggle__tag">{{ $t('Admin only') }}</el-tag>
            </div>
            <el-switch
                v-model="isManagingEnabled"
                :active-text="$t('Manager on')"
                :inactive-text="$t('Manager off')"
                inline-prompt
                size="large"
                class="privileged-toggle__switch"
                @click.stop
            />
          </div>
        </el-dropdown-item>
        <template v-for="group in customLinks" :key="group.key">
          <template v-if="group.items.length">
            <el-dropdown-item v-for="mfe in group.items" :key="mfe.route.path" @click.stop>
              <el-icon v-if="mfe.route.iconName">
                <component :is="'icon-' + mfe.route.iconName"/>
              </el-icon>
              <router-link :to="'/' + mfe.route.path" @click.stop>{{ mfe.name }}</router-link>
            </el-dropdown-item>
          </template>
        </template>

        <el-dropdown-item @click.stop="handleLogout">
          {{ $t('Logout') }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import { useAuth } from '../../compositions/authentication'
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import HeaderUserWorkspacesSelection from '@/modules/core/components/layout/HeaderUserWorkspacesSelection.vue';
import { isAdmin, isManagingEnabled, isLoadingDataAsUser, isPrivilegedUser } from '@/modules/core/store/auth';

const emit = defineEmits(['open']);
const { user, logout: logoutApi } = useAuth()
const router = useRouter()
const wsConfig = useWsConfiguration()

const { navBar } = storeToRefs(usePluginsMicroFrontends());
const customLinks = computed(() => navBar.value['user-dropdown']);

const handleLogout = async () => {
  await logoutApi()
  router.push('/login?redirect=' + location.href.replace(location.origin, ''))
}

const workspaceName = computed(() => decodeURIComponent(user.value?.workspace?.name[0].toUpperCase()))
</script>
<style scoped lang="scss">
.user-dropdown {
  margin-inline-start: auto;
}

.user-welcome {
  padding-inline-end: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-color);
  font-size: var(--base-font-size);

  > i {
    margin-inline-start: 5px;
  }
}

a {
  text-decoration: none;
  border: 0;
  text-align: right;
  height: 100%;
  cursor: pointer;
  color: var(--link);

  &:hover {
    text-decoration: underline;
  }
}

.privileged-toggle {
  min-width: 260px;
  width: min(360px, 90vw);
  white-space: normal;
  padding: 4px 0;

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--text-color-muted, #8c8c8c);
  }

  &__tag {
    align-self: flex-start;
  }

  &__switch {
    --el-switch-on-color: var(--el-color-primary);
    --el-switch-off-color: var(--el-border-color);
    flex-shrink: 0;
  }

  @media (max-width: 480px) {
    &__row {
      flex-direction: column;
      align-items: flex-start;
    }

    &__switch {
      width: 100%;
    }
  }
}
</style>
