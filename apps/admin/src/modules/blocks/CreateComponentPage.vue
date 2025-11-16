<template>
  <div class="create-component-page">
    <PageTitle
      title="Create Component"
      :back-route="{ name: 'components' }"
    />
    
    <el-card class="component-form-card">
      <ComponentForm
        :loading="submitting"
        @submitted="submit"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import PageTitle from '../core/components/semantics/PageTitle.vue';
import ComponentForm from './components/ComponentForm.vue';
import componentsService from '@/services/apis/components-service';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { useComponentsList } from './store/components-list';
import { useRouter } from 'vue-router';

const router = useRouter();
const componentsStore = useComponentsList();

const { submit, submitting } = useSubmitting(
  ({ componentName, identifier, description, content }) => componentsService.create({ componentName, identifier, description, content }),
  {
    success: 'Component created successfully',
    error: 'Failed to create component'
  }, (comp) => {
    componentsStore.retry();
    router.push({ name: 'editComponent', params: { componentId: comp._id } });
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
