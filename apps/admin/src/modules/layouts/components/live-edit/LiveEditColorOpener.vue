<script setup lang="ts">
import { useLiveEditStore } from '@/modules/layouts/store/live-edit';
import { isEditingEnabled } from '@/modules/core/store/auth';

const { openPaletteColorLiveEdit } = useLiveEditStore()

defineProps<{ color: string }>()
</script>

<template>
  <div v-if="isEditingEnabled" class="live-edit-opener" @click.stop="openPaletteColorLiveEdit(color)">
    <el-icon>
      <icon-brush/>
    </el-icon>
  </div>
</template>

<style scoped>
.live-edit-opener {
  cursor: pointer;
  position: absolute;
  top: 0;
  inset-inline: calc(100% - 28px);
  font-size: 24px;
}

.live-edit-opener:hover {
  color: var(--secondary-color);
}
</style>