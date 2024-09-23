<script setup lang="ts">
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import PermissionScopeSelector from '@/modules/no-code/components/PermissionScopeSelector.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { IBlueprintLimitation, IBlueprintPropertyDescriptor, PermissionScope } from '@qelos/global-types';

const model = defineModel<Array<IBlueprintLimitation>>()

const props = defineProps<{
  permissionScope: PermissionScope,
  properties: Record<string, IBlueprintPropertyDescriptor>;
}>()

function addLimitation() {
  if (!model.value) {
    model.value = [];
  }
  model.value.push({
    scope: props.permissionScope || PermissionScope.USER,
    value: 1
  })
}

</script>

<template>
  <div v-for="(limit, index) in model" :key="index" class="property">
    <FormRowGroup>
      <PermissionScopeSelector v-model="limit.scope"/>
      <el-form-item>
        <template #label>
          {{ $t('Properties') }}
          <InfoIcon content="Permission scope determines the level at which the permission is applied."/>
        </template>
        <el-select multiple
                   filterable
                   allow-create
                   default-first-option
                   v-model="limit.properties">
          <el-option v-for="(prop, key) in props.properties" :key="key" :label="prop.title" :value="key"/>
        </el-select>
      </el-form-item>
      <FormInput v-model="limit.value" type="number" title="Limit Amount"/>
      <div class="flex-0 remove-row">
        <RemoveButton @click="model.splice(model.indexOf(limit), 1)"/>
      </div>
    </FormRowGroup>
  </div>
  <AddMore @click="addLimitation"/>
</template>

<style scoped>
.remove-row {
  margin-bottom: 18px;
}
</style>