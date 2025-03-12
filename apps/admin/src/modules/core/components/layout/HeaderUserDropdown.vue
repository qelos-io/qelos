<template>
  <el-dropdown class="user-dropdown">
    <div class="el-dropdown-link user-welcome">
      <span>{{ user.firstName }}</span>
      <el-avatar class="avatar-img" v-if="user.workspace || user.profileImage" :src="user.profileImage">
        {{ user.workspace?.name[0].toUpperCase() }}
      </el-avatar>
      <el-icon>
        <icon-arrow-down/>
      </el-icon>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <HeaderUserWorkspacesSelection v-if="wsConfig.isActive"/>
        <el-dropdown-item>
          <router-link :to="{name: 'updateProfile'}">{{ $t('Update profile') }}</router-link>
        </el-dropdown-item>
        <el-dropdown-item v-if="isAdmin" id="edit-mode-toggle">
          <el-switch
              v-model="isManagingEnabled"
              active-text="Manager View"
              inactive-text="User View"
              style="--el-switch-on-color: #6bc7bc; --el-switch-off-color: #e7bc56;"
              size="large"
              inline-prompt
          />
        </el-dropdown-item>
        <el-dropdown-item v-if="isAdmin" id="edit-mode-toggle">
          <el-switch
              v-model="isEditingEnabled"
              active-text="Editor View"
              inactive-text="User View"
              style="--el-switch-on-color: #6bc7bc; --el-switch-off-color: #e7bc56;"
              size="large"
              inline-prompt
          />
        </el-dropdown-item>
        <template v-for="group in customLinks" :key="group.key">
          <template v-if="group.items.length">
            <el-dropdown-item v-for="mfe in group.items" :key="mfe.route.path">
              <el-icon v-if="mfe.route.iconName">
                <component :is="'icon-' + mfe.route.iconName"/>
              </el-icon>
              <router-link :to="'/' + mfe.route.path">{{ mfe.name }}</router-link>
            </el-dropdown-item>
          </template>
        </template>

        <el-dropdown-item @click="logout">
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
import { isAdmin, isEditingEnabled, isManagingEnabled } from '@/modules/core/store/auth';

const emit = defineEmits(['open']);
const { user, logout: logoutApi } = useAuth()
const router = useRouter()
const wsConfig = useWsConfiguration()

const { navBar } = storeToRefs(usePluginsMicroFrontends());
const customLinks = computed(() => navBar.value['user-dropdown']);

const logout = async () => {
  await logoutApi()
  router.push('/login?redirect=' + location.href.replace(location.origin, ''))
}
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

.avatar-img :deep(img) {
  margin: 0;
}
</style>
