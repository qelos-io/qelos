<template>
  <div class="edit-header">
    <h2>
      <slot/>
    </h2>
    <div class="buttons-group">
      <el-button native-type="submit" type="primary" :loading="submitting">
        <el-icon>
          <component :is="'icon-' + icon"/>
        </el-icon>
      </el-button>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { inject } from 'vue';

defineProps({
  icon: {
    type: String,
    default: 'promotion'
  },
})

const submitting = inject('submitting', false)
</script>
