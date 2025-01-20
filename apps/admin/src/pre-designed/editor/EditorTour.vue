<script setup lang="ts">
import { useToursStore } from '@/modules/core/store/tours';

const toursStore = useToursStore();
toursStore.setCurrentTour('welcome-editor', 1)
</script>

<template>
  <el-tour v-model="toursStore.tourOpen" @finish="toursStore.tourFinished">
    <el-tour-step
        target="#edit-mode-toggle"
        title="Start your editing journey"
        description="After applying the edit mode, you can start editing your pages and blocks."/>
    />
    <el-tour-step
        target="#no-code-wizard-btn"
        title="Add components easily"
        description="The wizard will help you to add components easily using the database described in Blueprints."/>
    />
    <el-tour-step
        target="#no-code-code-btn"
        title="Edit the code"
        description="If you are a developer, you can edit the code of the page directly, state management and initial HTTP requests on page load."/>
      />
  </el-tour>
</template>

<style scoped>

</style>