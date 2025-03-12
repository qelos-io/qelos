<template>
  <nav :class="{ show: opened }">
    <div class="mobile-mask" @click="close"/>
    <router-link to="/" class="home-logo">
      <img :alt="appConfig.name" :src="appConfig.logoUrl">
    </router-link>

    <el-menu router :default-active="$route.path">
      <div class="nav-group" v-if="isEditingEnabled">
        <el-menu-item id="menu-item-create-new-page" @click="openDrawer">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'plus-circle']"/>
          </el-icon>
          <span>{{ $t('Create New Page') }}</span>
        </el-menu-item>

        <QuicklyCreateMicrofrontends v-model="dialogVisible"/>

      </div>
      <template v-for="group in navBar.top">
        <div :key="group.key" class="nav-group" v-if="group.items.length">
          <h4 v-if="group.name">{{ group.name }}</h4>
          <el-menu-item v-for="mfe in group.items" :key="mfe.route.path" :route="'/' + mfe.route.path"
                        :index="'/' + mfe.route.path">
            <el-icon v-if="mfe.route.iconName">
              <component :is="'icon-' + mfe.route.iconName"/>
            </el-icon>
            <span>{{ mfe.name }}</span>
          </el-menu-item>
        </div>
      </template>


      <el-menu-item v-if="isPrivilegedUser" route="/admin-dashboard" index="/admin-dashboard">
        <el-icon>
          <font-awesome-icon :icon="['fas', 'chart-column']" />
        </el-icon>
        <span>{{ $t('Admin Dashboard') }}</span>
      </el-menu-item>

      <div class="nav-group" v-if="isManagingEnabled">
        <h4>{{ $t('COMPONENTS') }}</h4>

        <el-sub-menu index="3">
          <template #title>
            <el-icon>
              <icon-box/>
            </el-icon>
            <span>{{ $t('Content Boxes') }}</span>
          </template>
          <el-menu-item :route="{ name: 'blocks' }" index="/blocks">
            <span>{{ $t('Boxes List') }}</span>
          </el-menu-item>
          <el-menu-item :route="{ name: 'createBlock' }" index="/blocks/new">
            <span>{{ $t('Create Content Box') }}</span>
          </el-menu-item>
        </el-sub-menu>
      </div>

      <div class="nav-group" v-if="isManagingEnabled">
        <h4>{{ $t('MANAGE') }}</h4>
        <el-menu-item :route="{ name: 'storageList' }" index="/assets">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'folder-tree']"/>
          </el-icon>
          <span>{{ $t('Storage & Assets') }}</span>
        </el-menu-item>

        <el-menu-item v-if="isAdmin && isManagingEnabled" index="/users">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'users']"/>
          </el-icon>
          <span>{{ $t('Users') }}</span>
        </el-menu-item>

        <el-menu-item v-if="isAdmin && isManagingEnabled" index="/admin/workspaces">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'briefcase']"/>
          </el-icon>
          <span>{{ $t('Workspaces') }}</span>
        </el-menu-item>

        <el-menu-item :route="{ name: 'drafts' }" index="/drafts">
          <el-icon>
            <font-awesome-icon :icon="['far', 'file-lines']"/>
          </el-icon>
          <span>{{ $t('Drafts') }}</span>
        </el-menu-item>

        <el-menu-item id="menu-item-blueprints" v-if="isAdmin && isManagingEnabled" :route="{ name: 'blueprints' }" index="/no-code/blueprints">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'database']"/>
          </el-icon>
          <span>{{ $t('Blueprints') }}</span>
        </el-menu-item>

        <el-menu-item v-if="isAdmin && isManagingEnabled" :route="{ name: 'configurations' }" index="/configurations">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'gear']"/>
          </el-icon>
          <span>{{ $t('Configurations') }}</span>
        </el-menu-item>
      </div>

      <div class="nav-group" v-if="isAdmin && isManagingEnabled">
        <h4>{{ $t('PLUGINS') }}</h4>
        <el-menu-item :route="{ name: 'plugins' }" index="/plugins">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'plug-circle-bolt']"/>
          </el-icon>
          <span>{{ $t('Plugins List') }}</span>
        </el-menu-item>
        <el-menu-item :route="{ name: 'integrations' }" index="/integrations">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'arrows-turn-to-dots']" />
          </el-icon>
          <span>{{ $t('Integrations') }}</span>
        </el-menu-item>
      </div>

      <template v-for="group in navBar.bottom">
        <div :key="group.key" class="nav-group" v-if="group.items.length">
          <h4 v-if="group.name">{{ group.name }}</h4>
          <el-menu-item v-for="mfe in group.items" :key="mfe.route.path" :route="'/' + mfe.route.path"
                        :index="'/' + mfe.route.path">
            <el-icon v-if="mfe.route.iconName">
              <component :is="'icon-' + mfe.route.iconName"/>
            </el-icon>
            <span>{{ mfe.name }}</span>
          </el-menu-item>
        </div>
      </template>
      <LiveEditColorOpener color="navigationBgColor"/>
    </el-menu>
  </nav>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import { isAdmin, isEditingEnabled, isManagingEnabled, isPrivilegedUser } from '@/modules/core/store/auth';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import LiveEditColorOpener from '@/modules/layouts/components/live-edit/LiveEditColorOpener.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { ref } from 'vue';

const { navBar } = storeToRefs(usePluginsMicroFrontends());
const { appConfig } = useAppConfiguration();
import QuicklyCreateMicrofrontends from './navigation/QuicklyCreateMicrofrontends.vue';

// Visibility state of the modal window
const dialogVisible = ref(false);

const openDrawer = () => {
  dialogVisible.value = true;
};

defineProps({ opened: Boolean })
const emit = defineEmits(['close'])

const close = () => emit('close')

</script>
<style scoped lang="scss">
$nav-width: 240px;

nav {
  display: flex;
  flex-direction: column;
  background-color: var(--nav-bg-color);
  transition: width .2s linear;
  width: $nav-width;
  overflow-y: auto;
  position: relative;
}

nav .el-menu,
nav {
  --el-menu-text-color: var(--secondary-color);
  --el-menu-hover-bg-color: var(--main-color);
  --el-menu-bg-color: var(--nav-bg-color);
  --el-menu-active-color: var(--third-color);
  border: 0;
  scrollbar-color: var(--el-menu-hover-bg-color) var(--nav-bg-color);
  overflow: hidden;
  scrollbar-width: thin;

  &:hover {
    overflow: auto;
  }
}

.el-menu-item:hover {
  --el-menu-text-color: var(--negative-color);
  --el-menu-hover-bg-color: var(--main-color);
  --el-menu-bg-color: var(--nav-bg-color);
  border: 0;
}

.el-menu-item {
  padding: 0;
  margin: 5px;
  border-radius: 5px;
  line-height: 50px;
  height: 50px;
}

.el-sub-menu {
  margin: 5px;

  ::v-deep(.el-sub-menu__title) {
    padding: 0;
    border-radius: 5px;
    line-height: 50px;
    height: 50px;
    --el-menu-text-color: var(--secondary-color);

    &:hover {
      color: var(--negative-color);
    }
  }

  ::v-deep(.el-menu) {
    background-color: var(--nav-bg-color);
    --el-menu-text-color: var(--secondary-color);
  }
}

a:hover {
  border: none;
}

.mobile-mask {
  display: none;
}

.home-logo {
  display: block;
  padding: 5px 0 10px 0;
  height: 70px;
  align-self: center;
  text-align: center;
  background-color: var(--nav-bg-color);
  transition: background 0.1s linear;
  width: $nav-width;
  position: sticky;
  top: 0;
  z-index: 2;

  img {
    max-width: 100%;
    max-height: 100%;
  }
}

@media (max-width: 600px) {
  nav {
    position: absolute;
    width: auto;
    left: -100%;
    top: 0;
    bottom: 0;
    overflow: hidden;
    transition: left 0.2s ease-in-out;
    z-index: 5;

    &.show {
      display: flex;
      left: 0;

      .mobile-mask {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: -1;
      }
    }
  }

  .home-logo {
    background: transparent;

    img {
      display: inline;
    }
  }
}

@media (min-width: 1200px) {
  nav {
    margin: var(--spacing);
    border-radius: var(--border-radius);
    width: $nav-width;
  }

  nav .home-logo {
    width: $nav-width;
  }

  nav .home-logo img {
    display: inline-block;
  }
}

.nav-group {
  h4 {
    color: var(--negative-color);
    font-size: var(--base-font-size);
    font-weight: normal;
    margin: 15px 0 5px;

    &:before {
      content: '';
      display: inline-block;
      vertical-align: middle;
      width: 15px;
      height: 1px;
      background-color: var(--nav-bg-color);
      margin-inline-end: 5px;
    }
  }
}

.bottom {
  margin-top: auto;
}
</style>
