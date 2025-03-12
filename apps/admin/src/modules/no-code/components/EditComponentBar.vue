<script setup lang="ts">
import { inject, nextTick, onMounted, ref } from 'vue';

const editableManager = inject('editableManager');
const show = ref(false);

onMounted(async () => {
  await nextTick();
  if (editableManager) {
    (requestIdleCallback || setTimeout)(() => show.value = true)
  }
})
</script>

<template>
  <el-dropdown class="edit-component-bar" v-if="editableManager && show">
    <el-button text class="el-dropdown-link">
      <font-awesome-icon :icon="['fas', 'ellipsis-vertical']"/>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item @click="editableManager.editComponent($parent.$el)">
          {{ $t('Update') }}
        </el-dropdown-item>
        <el-dropdown-item @click="editableManager.addComponentBefore($parent.$el)">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'rotate-left']"/>
          </el-icon>
          <span>{{ $t('Add Component Before') }}</span>
        </el-dropdown-item>
        <el-dropdown-item @click="editableManager.addComponentAfter($parent.$el)">
          <el-icon>
            <font-awesome-icon :icon="['fas', 'rotate-right']"/>
          </el-icon>
          <span>{{ $t('Add Component After') }}</span>
        </el-dropdown-item>
        <el-dropdown-item class="danger" @click="editableManager.removeComponent($parent.$el)">
          {{ $t('Remove') }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style lang="scss">
*:has(> .edit-component-bar) {
  border: 1px dashed #ccc;
  position: relative;
  padding-block-end: 28px;
}

</style>
<style scoped>
.edit-component-bar {
  position: absolute;
  z-index: 99;
  margin: 0 auto;
  top: 0;
  right: 0;
}

.el-dropdown-link {
  cursor: pointer;
  user-select: none;
  outline: none;
}
</style>