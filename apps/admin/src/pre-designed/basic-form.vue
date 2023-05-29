<template>
  <main>
    <h1>{{isEdit ? $t('Edit') : $t('Create')}} {{crud.display.capitalized}}</h1>
    <el-form @submit.prevent="submit">
      <div v-for="(row, key) in crud.schema" :key="key" class="row">
        <el-form-item v-if="row.type === 'Boolean'" :label="capitalize(key as string)">
          <el-switch  v-model="item[key]" />
        </el-form-item>
        <FormInput v-else :title="capitalize(key as string)" v-model="item[key]" />
      </div>
      <div class="row"><SaveButton :submitting="submitting"/></div>
    </el-form>
  </main>
</template>

<script lang="ts" setup>
import {useRoute} from 'vue-router';
import {computed, ref, watch} from 'vue';
import {getCrud} from '@/services/crud';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import {useSubmitting} from '@/modules/core/compositions/submitting';

const route = useRoute();
const api = computed(() => getCrud(route.meta.crudBasePath as string || ''));

const crud = computed(() => {
  const crud = route.meta.crud as any || {display: {}};
  const screens = crud.screens || {list: {}}
  return {
    ...crud,
    display: {
      name: 'item',
      capitalizedPlural: 'Items',
      ...(crud.display || {}),
    },
    screens: {
      create: {
        structure: null,
        ...screens.create,
      },
      edit: {
        structure: null,
        ...screens.edit,
      },
    },
  }
});
const isEdit = computed(() => !!route.params.id);
const item = ref({});

const {submit, submitting} = useSubmitting(() => api.value.update(route.params.id as string, item.value))

if (isEdit.value) {
  watch(api, () => {
    api.value.getOne(route.params.id as string).then(data => item.value = data)
  }, {immediate: true})
}

function capitalize(str = '') {
  return str[0].toUpperCase() + str.substring(1, str.length);
}
</script>

<style scoped>
.row {
  padding: var(--spacing);
}
</style>