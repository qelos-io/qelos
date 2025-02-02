<template>
  <el-dropdown :class="{'user-dropdown': true, 'viewer': !isAdmin || $isMobile}">
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
import { isAdmin } from '@/modules/core/store/auth';

const emit = defineEmits(['open']);
const { user, logout: logoutApi } = useAuth()
const router = useRouter()
const wsConfig = useWsConfiguration()

const { navBar } = storeToRefs(usePluginsMicroFrontends());
const customLinks = computed(() => navBar.value['user-dropdown']);

const logout = async () => {
  await logoutApi()
  router.push('/login')
}
</script>
<style scoped lang="scss">
.user-dropdown.viewer {
  margin-inline-start: auto;
}

.user-welcome {
  padding-inline-end: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--main-color);
  font-size: 16px;

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
  color: var(--main-color);

  &:hover {
    text-decoration: underline;
  }
}

.avatar-img :deep(img) {
  margin: 0;
}
</style>
