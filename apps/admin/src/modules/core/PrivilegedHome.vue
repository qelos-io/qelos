<template>
  <div class="flex-container">
    <el-tabs model-value="metadata">
      <el-tab-pane name="metadata" :label="$t('Application Metadata')">
        <div class="blocks-list">

          <StatsCard v-if="!loadingBlocks"
                     color="cyan"
                     :value="blocks.length"
                     title="Total Blocks"
                     actionText="View Blocks"
                     actionRoute="/blocks"
                     icon="box"
          />
          <StatsCard v-if="!loadingStats"
                     color="blue"
                     :value="stats.users"
                     title="Total Users"
                     actionText="View Users"
                     actionRoute="/users"
                     :fa-icon="['fas', 'users']"
          />
          <StatsCard v-if="!loadingStats"
                     :value="stats.workspaces"
                     color="purple"
                     title="Total Workspaces"
                     actionText="View Workspaces"
                     actionRoute="/admin/workspaces"
                     :fa-icon="['fas', 'briefcase']"
          />

          <BlockItem id="dashboard-common-ops">
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
            <div class="container">
              <router-link :to="{name: 'editConfiguration', params: {key: 'workspace-configuration'}}">
                <h4 class="flex-row">
                  <el-icon>
                    <font-awesome-icon :icon="['far', 'building']"/>
                  </el-icon>
                  <span class="pad-start">{{ $t('Edit Workspaces Settings') }}</span>
                </h4>
              </router-link>
            </div>
            <div class="container">
              <router-link :to="{name: 'editConfiguration', params: {key: 'auth-configuration'}}">
                <h4 class="flex-row">
                  <el-icon>
                    <font-awesome-icon :icon="['fas', 'key']"/>
                  </el-icon>
                  <span class="pad-start">{{ $t('Edit Authentication Settings') }}</span>
                </h4>
              </router-link>
            </div>
          </BlockItem>
          <BlockItem>
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
          </BlockItem>
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
  <el-tour v-model="toursStore.tourOpen" @finish="toursStore.tourFinished">
    <el-tour-step
        target="#menu-item-blueprints"
        title="Create your Database"
        description="Blueprints are the definitions of your database, permissions, and Restful API. Create your first blueprint now!"
    />
    <el-tour-step
        target="#menu-item-create-new-page"
        title="Create your Pages"
        description="Once you created a database, it's time to create your pages. Click here to create your first page."
    />
    <el-tour-step
        target="#dashboard-common-ops"
        title="Configurations and Settings"
        description="Your application theme and layout, analytics scripts, login mechanism and account mechanism."/>
  </el-tour>
</template>

<script setup lang="ts">
import { ref, toRefs } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBlocksList } from '@/modules/blocks/store/blocks-list';
import { resetConfiguration, useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import configurationsService from '@/services/configurations-service';
import { PALETTES } from '@/modules/core/utils/colors-palettes';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LiveEditColorOpener from '@/modules/layouts/components/live-edit/LiveEditColorOpener.vue';
import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import DesignConfiguration from '@/modules/configurations/components/DesignConfiguration.vue';
import StatsCard from '@/modules/pre-designed/components/StatsCard.vue';
import { useUsersStats } from '@/modules/users/compositions/users-stats';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { useToursStore } from '@/modules/core/store/tours';

const { appConfig, loaded: configLoaded } = useAppConfiguration();

const { loading: loadingBlocks, blocks } = toRefs(useBlocksList())
const { loading: loadingStats, stats } = useUsersStats()
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

const toursStore = useToursStore();
toursStore.setCurrentTour('dashboard', 1);
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
  .blocks-list {
    padding: 0 1%;
  }
}

.blocks-list i {
  font-size: 24px;
}

.blocks-list > * {
  width: 28%;
  margin: 2%;
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
