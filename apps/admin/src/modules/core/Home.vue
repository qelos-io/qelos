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
        <router-link :to="{name: 'createPost'}">
          <h3>
            <el-icon>
              <icon-document/>
            </el-icon>
            {{ $t('Create Post') }}
          </h3>
        </router-link>

        <router-link :to="{name: 'createCategory'}">
          <h3>
            <el-icon>
              <icon-folder-opened/>
            </el-icon>
            {{ $t('Create Category') }}
          </h3>
        </router-link>

        <router-link :to="{name: 'editConfiguration', params: {key: 'app-configuration'}}">
          <h3>
            <el-icon>
              <icon-setting/>
            </el-icon>
            {{ $t('Edit website configuration') }}
          </h3>
        </router-link>
      </div>
    </GpItem>

    <GpItem>
      <template v-slot:title>
        {{ $t('Information') }}
      </template>
      <h3 v-if="!loadingPosts">{{ t('{amount} Posts', {amount: posts.length}, posts.length) }}</h3>
      <h3 v-if="!loadingBlocks">{{ t('{amount} Blocks', {amount: blocks.length}, blocks.length) }}</h3>
    </GpItem>
  </div>
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
  margin: 20px;
  border: none;
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
import {usePostsListStore} from '@/modules/posts/store/posts-list';
import {computed, toRefs} from 'vue';
import {useI18n} from 'vue-i18n';
import {useBlocksList} from '@/modules/blocks/store/blocks-list';
import {resetConfiguration, useAppConfiguration} from '@/modules/configurations/store/app-configuration';
import configurationsService from '@/services/configurations-service';
import {PALETTES} from '@/modules/core/utils/colors-palettes';

const config = useAppConfiguration();
const appConfig = computed(() => config.value?.metadata && config.value.metadata || {})
const {loading: loadingPosts, posts, fetchPosts} = toRefs(usePostsListStore())

const {loading: loadingBlocks, blocks} = toRefs(useBlocksList())

const {t} = useI18n();

fetchPosts.value();

async function changePalette(colorsPalette) {
  await configurationsService.update('app-configuration', {
    metadata: {
      ...appConfig.value,
      colorsPalette
    }
  })
  await resetConfiguration();
}

</script>
