<template>
  <div class="edit-component-page">
    <PageTitle
      :title="'Edit Component'"
      :back-route="{ name: 'components' }"
    />
    
    <el-card v-loading="submitting" class="component-form-card">
      <ComponentForm
        v-if="component"
        :initial-data="component"
        @submitted="submit"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import componentsService from '@/services/components-service';
import PageTitle from '../core/components/semantics/PageTitle.vue';
import ComponentForm from './components/ComponentForm.vue';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { ref } from 'vue';
import { useComponentsList } from '@/modules/blocks/store/components-list';

const componentsStore = useComponentsList();

const route = useRoute();
const { submit, submitting } = useSubmitting(
  ({ componentName, identifier, description, content }) => {
    return componentsService.update(route.params.componentId as string, { componentName, identifier, description, content })
  },
  {
    success: 'Component updated successfully',
    error: 'Failed to update component'
  },
  () => {
    componentsStore.retry();
  }
)

const component = ref<any>(null);

componentsService.getOne(route.params.componentId as string).then((data) => {
  component.value = data;
});
</script>

<style scoped>
.edit-component-page {
  padding: 20px;
}

.component-form-card {
  margin-top: 20px;
}
</style>
