<template>
  <el-breadcrumb class="app-breadcrumb" :separator="separator">
    <el-breadcrumb-item 
      v-for="(item, index) in items" 
      :key="index"
      :to="item.to"
    >
      <BreadcrumbIcon v-if="item.icon" :icon="item.icon" />
      {{ item.text }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { PropType } from 'vue'
import BreadcrumbIcon from './BreadcrumbIcon.vue'

interface BreadcrumbItem {
  text: string
  icon?: any
  to?: string | object
}

interface Props {
  items: BreadcrumbItem[]
  separator?: string
}

defineProps<Props>()
</script>

<style scoped>
.app-breadcrumb {
  margin-bottom: 20px;
  padding: 10px 0;
}
</style>
