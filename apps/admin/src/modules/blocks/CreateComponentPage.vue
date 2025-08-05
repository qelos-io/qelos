<template>
  <div class="create-component-page">
    <PageTitle
      title="Create Component"
      :back-route="{ name: 'components' }"
    />
    
    <el-card class="component-form-card">
      <ComponentForm
        :loading="loading"
        @submitted="submit"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PageTitle from '../core/components/semantics/PageTitle.vue';
import ComponentForm from './components/ComponentForm.vue';
import componentsService from '@/services/components-service';
import { useSubmitting } from '@/modules/core/compositions/submitting';

const loading = ref(false);
const { submit, submitting } = useSubmitting(
  ({ componentName, identifier, description, content }) => componentsService.create({ componentName, identifier, description, content }),
  {
    success: 'Component created successfully',
    error: 'Failed to create component'
  }
)
</script>

<style scoped>
.create-component-page {
  padding: 20px;
}

.component-form-card {
  margin-top: 20px;
}
</style>
