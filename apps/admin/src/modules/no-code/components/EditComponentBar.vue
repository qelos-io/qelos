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
  padding-block-end: 28px;

  &:hover > .edit-component-bar {
    display: block;
  }
}

</style>
<style scoped>
.edit-component-bar {
  display: none;
  position: absolute;
  z-index: 99;
  margin: 0 auto;
  bottom: 0;
  left: calc(50% - 71px);
}
</style>