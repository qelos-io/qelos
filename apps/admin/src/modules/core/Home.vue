<template>
  <h3>{{ $t('Welcome!') }}</h3>
  <template v-if="isPrivilegedUser">
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
        <h3 v-if="!loadingBlocks">{{ t('{amount} Blocks', {amount: blocks.length}, blocks.length) }}</h3>
      </GpItem>
    </div>
  </template>
</template>
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
</style>
<script setup lang="ts">
import GpItem from '@/modules/core/components/layout/GpItem.vue';
import {computed, toRefs, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {useBlocksList} from '@/modules/blocks/store/blocks-list';
import {resetConfiguration, useAppConfiguration} from '@/modules/configurations/store/app-configuration';
import configurationsService from '@/services/configurations-service';
import {PALETTES} from '@/modules/core/utils/colors-palettes';
import {authStore, isPrivilegedUser} from '@/modules/core/store/auth';
import {useConfirmAction} from '@/modules/core/compositions/confirm-action';
import router from '@/router';

const config = useAppConfiguration();
const appConfig = computed(() => config.value?.metadata && config.value.metadata || {})

const {loading: loadingBlocks, blocks} = toRefs(useBlocksList())
const {t} = useI18n();

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
  if (!isPrivilegedUser && appConfig.value.homeScreen) {
    router.push(appConfig.value.homeScreen);
  }
  unWatch();
}, {immediate: true})
</script>
