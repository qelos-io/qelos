<template>
  <div class="admin-panel" v-if="isLoaded">
    <Navigation class="navigation" :opened="navigationOpened" @close="navigationOpened = false"/>
    <div class="admin-content">
      <Header class="header" @open="navigationOpened = true"/>
      <div class="main">
        <LiveEditColorOpener color="bgColor"/>
        <router-view class="main-content"/>
      </div>
      <AssetsDetailsPanel v-if="isPrivilegedUser"/>
    </div>
  </div>
  <template v-if="openModals?.length">
    <MicroFrontendModal v-for="{mfe, props} in openModals" :key="mfe.name" :mfe="mfe" :props="props"/>
  </template>
  <LiveEditManager/>
</template>

<script lang="ts" setup>
import {ref, toRef, watch} from 'vue'
import {useAuthenticatedIntercept} from './compositions/authentication'
import Header from './components/layout/Header.vue'
import Navigation from './components/layout/Navigation.vue'
import AssetsDetailsPanel from '@/modules/assets/components/AssetsDetailsPanel/AssetsDetailsPanel.vue'
import {useRouter} from 'vue-router'
import {isPrivilegedUser} from '@/modules/core/store/auth';
import {usePluginsMicroFrontends} from '@/modules/plugins/store/plugins-microfrontends';
import MicroFrontendModal from '@/modules/plugins/components/MicroFrontendModal.vue';
import LiveEditManager from '@/modules/layouts/components/live-edit/LiveEditManager.vue';
import LiveEditColorOpener from '@/modules/layouts/components/live-edit/LiveEditColorOpener.vue';

const router = useRouter()

const navigationOpened = ref(false)
const {isLoaded} = useAuthenticatedIntercept();
const openModals = toRef(usePluginsMicroFrontends(), 'openModals');

router.afterEach(() => navigationOpened.value = false)

watch(navigationOpened, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : '';
})
</script>
<style scoped lang="scss">
.admin-panel {
  display: flex;

  width: 100%;
  height: 100%;
  flex-direction: row;
  background-color: var(--body-bg);
}

.admin-content {
  display: flex;
  flex-direction: column;
  flex: 1;

  .main {
    flex: 1;
    overflow: auto;
    background-color: var(--body-bg);
    position: relative;
  }

  .main-content {
    width: 100%;
    height: 100%;
  }
}

@media (max-width: 600px) {
  .admin-panel {
    flex-direction: column;
  }
}
</style>
