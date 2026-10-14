<template>
  <div v-if="loaded" class="assets-list">
    <div v-for="asset in assets" :key="asset.identifier" class="asset-box" :title="asset.identifier">
      <img v-if="asset.type === 'image'" :src="asset.publicUrl" :alt="asset.identifier" loading="lazy" />
      <font-awesome-icon v-else icon="fa-solid fa-file" :aria-label="asset.identifier"/>
    </div>
    <p v-if="!assets.length" class="empty-assets">{{ $t('No files in this storage yet') }}</p>
  </div>
  <el-skeleton v-else :rows="2" animated />
</template>
<script lang="ts" setup>
import { ref, watch } from 'vue'
import { getAssetInStorage } from '../../compositions/assets'

const props = defineProps({
  storage: {
    type: String,
    required: true
  },
  identifier: {
    type: String,
    default: '/'
  }
})

const loaded = ref(false)
const assets = ref([])

watch(() => props.storage + props.identifier, async () => {
  loaded.value = false
  try {
    assets.value = await getAssetInStorage(props.storage, props.identifier)
  } finally {
    loaded.value = true
  }
}, { immediate: true })
</script>
<style scoped>
.assets-list {
  overflow: auto;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  width: 100%;
}

.asset-box {
  margin: 1%;
  width: 30%;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.1s ease-in-out;
}

.asset-box:hover {
  background-color: var(--el-fill-color-light);
}

.empty-assets {
  width: 100%;
  text-align: center;
  color: var(--el-text-color-secondary);
}

img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

i {
  font-size: 36px;
}
</style>
