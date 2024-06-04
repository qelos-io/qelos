<script setup lang="ts">
import { provide, reactive, toRef, watch } from 'vue';
import { IBlueprint } from '@qelos/global-types';
import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import PermissionScopeSelector from '@/modules/no-code/components/PermissionScopeSelector.vue';
import CrudOperationSelector from '@/modules/no-code/components/CrudOperationSelector.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import BlueprintPropertyTypeSelector from '@/modules/no-code/components/BlueprintPropertyTypeSelector.vue';

const props = withDefaults(defineProps<{
  submitting: boolean;
  blueprint: Partial<IBlueprint>;
}>(), {
  submitting: false,
  blueprint: () => ({} as any & Partial<IBlueprint>)
});
const emit = defineEmits(['submitted']);

const edit = reactive({ name: '', ...props.blueprint });

provide('submitting', toRef(props, 'submitting'));

watch(() => edit.name, (newName) => {
  if (newName && newName.trim()) {
    edit.identifier = newName
        .replace(/ /g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .toLowerCase()
  }
})

function submit() {
  emit('submitted')
}
</script>

<template>
  <el-form @submit.native.prevent="submit">
    <EditHeader>
      {{ $t(blueprint._id ? 'Edit Blueprint' : 'Create Blueprint') }}
      <strong v-if="blueprint?.name">{{ blueprint.name }}</strong>
    </EditHeader>

    <div class="input-group">
      <FormInput v-model="edit.name" title="Name" required/>
      <FormInput v-model="edit.identifier" title="Identifier" required/>

      <FormInput v-model="edit.description" title="Description"/>
      <el-collapse accordion>
        <el-collapse-item name="1">
          <template #title>
            <h3>{{ $t('Permissions and Roles') }}</h3>
          </template>
          <PermissionScopeSelector v-model="edit.permissionScope"/>
          <FormRowGroup v-for="(permission, index) in edit.permissions" :key="index" class="permission">
            <CrudOperationSelector v-model="permission.operation"/>
            <PermissionScopeSelector v-model="permission.scope"/>
            <FormInput title="Roles" :model-value="permission.roleBased.join(',')"
                       @update:modelValue="permission.roleBased = $event.split(',')"/>
            <FormInput title="Workspace Roles" :model-value="permission.workspaceRoleBased.join(',')"
                       @update:modelValue="permission.workspaceRoleBased = $event.split(',')"/>
            <div class="flex-0 remove-row">
              <RemoveButton @click="edit.permissions.splice(edit.permissions.indexOf(permission), 1)"/>
            </div>
          </FormRowGroup>
          <AddMore @click="edit.permissions.push({workspaceRoleBased: [], roleBased: []})"/>
        </el-collapse-item>

        <el-collapse-item name="2">
          <template #title>
            <h3>{{ $t('Properties') }}</h3>
          </template>
          <FormRowGroup v-for="(property, key) in edit.properties" :key="key" class="property">
            <FormInput v-model="property.title" title="Title" required/>
            <BlueprintPropertyTypeSelector v-model="property.type"/>
            <FormInput v-model="property.description" title="Description"/>
            <FormInput v-model="property.required" title="Required" type="switch"/>
            <FormInput v-model="property.multi" title="Multi" type="switch"/>
            <div class="flex-0 remove-row">
              <RemoveButton @click="delete edit.properties[key]"/>
            </div>
          </FormRowGroup>
        </el-collapse-item>
      </el-collapse>
    </div>
  </el-form>
</template>
<style scoped>
h3 {
  margin-block: 10px;
}

.remove-row {
  margin-bottom: 18px;
}
</style>