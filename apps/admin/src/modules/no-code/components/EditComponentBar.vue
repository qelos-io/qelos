<script setup lang="ts">
import { inject } from 'vue';
const editableManager = inject('editableManager');
</script>

<template>
  <el-button-group class="edit-component-bar" v-if="editableManager">
    <el-button type="danger" size="small" @click="editableManager.removeComponent($parent.$el)">
      <el-icon>
        <font-awesome-icon :icon="['fas', 'trash']"/>
      </el-icon>
    </el-button>
    <el-button size="small" @click="editableManager.editComponent($parent.$el)">
      <el-icon>
        <icon-edit/>
      </el-icon>
    </el-button>
  </el-button-group>
</template>

<style lang="scss">
*:has(> .edit-component-bar) {
  border: 1px dashed #ccc;
  position: relative;

  &:hover {
    .edit-component-bar {
      display: block;
    }
  }
}

.edit-component-bar {
  display: none;
  position: absolute;
  z-index: 99;
  top: 0;
  left: 0;
}
</style>