<template>
  <div class="welcome">
    <h3>{{ $t('Switch Color Palette') }}</h3>
    <div class="blocks-list">
      <div v-for="(p, index) in PALETTES" :key="index" @click="changePalette(p.palette)" class="palette">
        <div v-for="color in p.colors" :key="color" :style="{backgroundColor: color}"></div>
      </div>
    </div>
  </div>
  <div class="blocks-list">
    <GpItem>
      <template v-slot:title>
        {{ $t('Common operations') }}
      </template>

      <div class="content">
        <router-link :to="{name: 'editConfiguration', params: {key: 'app-configuration'}}">
          <h3>
            <el-icon>
              <icon-setting/>
            </el-icon>
            {{ $t('Edit app configuration') }}
          </h3>
        </router-link>
      </div>
    </GpItem>

    <GpItem>
      <template v-slot:title>
        {{ $t('Information') }}
      </template>
      <h3 v-if="!loadingBlocks">{{ t('{amount} Blocks', { amount: blocks.length }, blocks.length) }}</h3>
      <h3 v-if="!loadingUsers">{{ t('{amount} Users', { amount: users.length }, users.length) }}</h3>
      <h3 v-if="!loadingWorkspaces">{{ t('{amount} Workspaces', { amount: workspaces.length }, workspaces.length) }}</h3>
    </GpItem>

    <GpItem>
      <template v-slot:title>
        {{ $t('Inputs UI') }}
      </template>
      <el-form class="metadata" @submit.stop.prevent>
        <p>{{ $t('Here is an input:') }}</p>
        <FormInput v-model="exampleText"/>
        <p>
          {{ $t('Change Background') }}
          <LiveEditColorOpener color="inputsBgColor"/>
        </p>
        <p>
          {{ $t('Change Text Color') }}
          <LiveEditColorOpener color="inputsTextColor"/>
        </p>
      </el-form>
    </GpItem>
  </div>
</template>

<script setup lang="ts">
import GpItem from '@/modules/core/components/layout/BlockItem.vue';
import { ref, toRefs, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBlocksList } from '@/modules/blocks/store/blocks-list';
import { resetConfiguration, useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import configurationsService from '@/services/configurations-service';
import { PALETTES } from '@/modules/core/utils/colors-palettes';
import { authStore, isPrivilegedUser } from '@/modules/core/store/auth';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import router from '@/router';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LiveEditColorOpener from '@/modules/layouts/components/live-edit/LiveEditColorOpener.vue';
import { useUsersList } from '@/modules/users/compositions/users';
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';
import useAdminWorkspacesList from '@/modules/workspaces/store/admin-workspaces-list';


const { appConfig } = useAppConfiguration();

const { loading: loadingBlocks, blocks } = toRefs(useBlocksList())
const { loading: loadingUsers, users } = toRefs(useUsersList())
const { loading: loadingWorkspaces, workspaces } = toRefs(useAdminWorkspacesList())
const { t } = useI18n();
const exampleText = ref(t('Example text'));

const changePalette = useConfirmAction(async function changePalette(colorsPalette) {
  await configurationsService.update('app-configuration', {
    metadata: {
      ...appConfig.value,
      colorsPalette
    }
  })
  await resetConfiguration();
});

const unWatch = watch(() => authStore.isLoaded, () => {
  if (!authStore.isLoaded) {
    return;
  }
  if (!isPrivilegedUser.value && appConfig.value.homeScreen) {
    router.push(appConfig.value.homeScreen);
  }
  setTimeout(() => unWatch(), 1)
}, { immediate: true })
</script>
<style scoped lang="scss">
.blocks-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-content: flex-start;
}

@media screen and (min-width: 1200px) {
  .blocks-list {
    padding: 0 2%;
  }
}

.blocks-list i {
  font-size: 24px;
}

.blocks-list > * {
  width: 28%;
  margin: 2%;
  border: none;
}

@media screen and (max-width: 1200px) {
  .blocks-list {
    flex-direction: column;

    > * {
      width: 96%;
    }
  }
}

h3 {
  padding: 10px;
  font-weight: normal;
}

h3 > * {
  vertical-align: middle;
}

.content {
  padding: 20px;
}

.colors-lines {

  width: 100%;
}

.palette {
  height: 50px;
  display: flex;
  flex-direction: row;
  cursor: pointer;
  border: 1px solid var(--border-color);

  > div {
    flex: 1;
  }
}

.item p {
  position: relative;
}
</style>
