<template>
<div class="flex-container">
  <el-tabs model-value="metadata">
    <el-tab-pane name="metadata" :label="$t('Application Metadata')">
      <div class="blocks-list">
        <GpItem>
          <template v-slot:title>
            {{ $t('Common operations') }}
          </template>

          <div class="container">
            <router-link :to="{name: 'editConfiguration', params: {key: 'app-configuration'}}">
              <h4 class="flex-row">
                <el-icon>
                  <font-awesome-icon :icon="['fas', 'gear']"/>
                </el-icon>
                <span class="pad-start">{{ $t('Edit App Settings') }}</span>
              </h4>
            </router-link>
          </div>
          <div class="container">
            <router-link :to="{name: 'editConfiguration', params: {key: 'ssr-scripts'}}">
              <h4 class="flex-row">
                <el-icon>
                  <font-awesome-icon :icon="['fab', 'html5']"/>
                </el-icon>
                <span class="pad-start">{{ $t('Edit SSR Scripts') }}</span>
              </h4>
            </router-link>
          </div>
        </GpItem>

        <GpItem>
          <template v-slot:title>
            {{ $t('Information') }}
          </template>
          <h4 class="container" v-if="!loadingBlocks">{{
              t('{amount} Blocks', { amount: blocks.length }, blocks.length)
            }}</h4>
          <h4 class="container" v-if="!loadingUsers">{{
              t('{amount} Users', { amount: users.length }, users.length)
            }}</h4>
          <h4 class="container" v-if="!loadingWorkspaces">{{
              t('{amount} Workspaces', { amount: workspaces.length }, workspaces.length)
            }}</h4>
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
    </el-tab-pane>
    <el-tab-pane name="colors" :label="$t('Color Palette & Design')">
      <div class="blocks-list">
        <div v-for="(p, index) in PALETTES" :key="index" @click="changePalette(p.palette)" class="palette">
          <div v-for="color in p.colors" :key="color" :style="{backgroundColor: color}"></div>
        </div>
      </div>
      <DesignConfiguration v-if="configLoaded"/>
    </el-tab-pane>
    <el-tab-pane name="blueprints" :label="$t('Blueprints')">
      <el-button @click.prevent="$router.push({name: 'createBlueprint'})">
        <font-awesome-icon :icon="['fas', 'plus']"/>
        <span class="pad-start">{{ $t('Create Blueprint') }}</span>
      </el-button>
      <BlueprintsList/>
    </el-tab-pane>
  </el-tabs>
</div>
</template>

<script setup lang="ts">
import GpItem from '@/modules/core/components/layout/BlockItem.vue';
import { ref, toRefs } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBlocksList } from '@/modules/blocks/store/blocks-list';
import { resetConfiguration, useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import configurationsService from '@/services/configurations-service';
import { PALETTES } from '@/modules/core/utils/colors-palettes';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LiveEditColorOpener from '@/modules/layouts/components/live-edit/LiveEditColorOpener.vue';
import { useUsersList } from '@/modules/users/compositions/users';
import useAdminWorkspacesList from '@/modules/workspaces/store/admin-workspaces-list';
import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import DesignConfiguration from '@/modules/configurations/components/DesignConfiguration.vue';

const { appConfig, loaded: configLoaded } = useAppConfiguration();

const { loading: loadingBlocks, blocks } = toRefs(useBlocksList())
const { loading: loadingUsers, users } = useUsersList()
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
</script>
<style scoped lang="scss">
.blocks-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-content: flex-start;
}

.container {
  margin-inline: 2%;
}

@media screen and (min-width: 1200px) {
  .blocks-list, container {
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
  font-size: 130%;
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
