<template>
  <div class="edit-component-page">
    <PageTitle :title="'Edit Component'" :back-route="{ name: 'components' }" />

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
import { useRoute } from "vue-router";
import componentsService from "@/services/apis/components-service";
import PageTitle from "../core/components/semantics/PageTitle.vue";
import ComponentForm from "./components/ComponentForm.vue";
import { useSubmitting } from "@/modules/core/compositions/submitting";
import { ref, watch, h } from "vue";
import { useComponentsList } from "@/modules/blocks/store/components-list";

const componentsStore = useComponentsList();

const route = useRoute();
const { submit, submitting } = useSubmitting(
  ({ componentName, identifier, description, content }) => {
    return componentsService.update(route.params.componentId as string, {
      componentName,
      identifier,
      description,
      content,
    });
  },
  {
    success: "Component updated successfully",
    error: (error: any) => {
      if (error?.response?.data?.reason) {
        // Split into error message and code snippet
        const parts = error?.response?.data?.reason.split("\n\n");
        const errorMsg = parts[0];
        const codeSnippet = parts.slice(1).join("\n\n");

        return {
          title: "Compilation Error",
          message: h("div", { class: "compilation-error" }, [
            h("div", { class: "error-message" }, errorMsg),
            codeSnippet
              ? h("pre", { class: "code-snippet" }, codeSnippet)
              : null,
          ]),
          dangerouslyUseHTMLString: false,
          duration: 10000, // 10 seconds for compilation errors
          customClass: "compilation-error-notification",
        };
      }

      return `Failed to update component`;
    },
  },
  () => {
    componentsStore.retry();
  }
);

const component = ref<any>(null);

function loadComponent() {
  componentsService.getOne(route.params.componentId as string).then((data) => {
    component.value = data;
  });
}

watch(() => componentsStore.components, loadComponent);

loadComponent();
</script>

<style scoped>
.edit-component-page {
  padding: 20px;
}

.component-form-card {
  margin-block-start: 20px;
}
</style>
