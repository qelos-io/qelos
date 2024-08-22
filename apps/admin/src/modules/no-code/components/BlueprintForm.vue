<script setup lang="ts">
import { provide, reactive, ref, toRef, watch } from 'vue';
import { EntityIdentifierMechanism, IBlueprint } from '@qelos/global-types';
import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import PermissionScopeSelector from '@/modules/no-code/components/PermissionScopeSelector.vue';
import CrudOperationSelector from '@/modules/no-code/components/CrudOperationSelector.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import BlueprintSelector from '@/modules/no-code/components/BlueprintSelector.vue';
import EditBlueprintProperties from '@/modules/no-code/components/EditBlueprintProperties.vue';
import { getKeyFromName } from '@/modules/core/utils/texts';

const props = withDefaults(defineProps<{
  submitting: boolean;
  blueprint: Partial<IBlueprint>;
}>(), {
  submitting: false,
  blueprint: () => ({} as any & Partial<IBlueprint>)
});
const emit = defineEmits(['submitted']);

const edit = reactive<Partial<IBlueprint>>({
  name: '',
  dispatchers: { create: false, delete: false, update: false }, ...props.blueprint
});
const blueprintProperties = ref()
provide('edit', edit);

const blueprintMapping = ref(
    Object
        .entries(edit.updateMapping || {})
        .map(([key, value]) => ({ key, value }))
);

provide('submitting', toRef(props, 'submitting'));

watch(() => edit.name, (newName) => {
  if (newName && newName.trim()) {
    edit.identifier = getKeyFromName(newName)
  }
})

function submit() {
  const data = { ...edit };
  if (blueprintProperties.value) {
    data.properties = blueprintProperties.value.reduce((acc, { key, ...rest }) => ({ ...acc, [key]: rest }), {});
  }
  if (blueprintMapping.value) {
    data.updateMapping = blueprintMapping.value.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
  }
  emit('submitted', data)
}
</script>

<template>
  <el-form @submit.native.prevent="submit">
    <EditHeader>
      {{ $t(blueprint._id ? 'Edit Blueprint' : 'Create Blueprint') }}
      <strong v-if="blueprint?.name">{{ blueprint.name }}</strong>
    </EditHeader>

    <el-tabs model-value="general">
      <el-tab-pane :label="$t('General')" name="general">
        <div class="input-group">
          <FormInput v-model="edit.name" title="Name" required/>
          <FormInput v-model="edit.identifier" title="Identifier" required/>

          <FormInput v-model="edit.description" title="Description"/>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="$t('Permissions and Roles')" name="rbac">
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
      </el-tab-pane>

      <el-tab-pane :label="$t('Properties')" name="properties">
        <el-form-item :label="$t('Identifier Mechanism for Entities')">
          <el-select v-model="blueprint.entityIdentifierMechanism" requried :placeholder="$t('Select mechanism')">
            <el-option label="Object ID" :value="EntityIdentifierMechanism.OBJECT_ID"/>
            <el-option label="GUID" :value="EntityIdentifierMechanism.GUID"/>
          </el-select>
        </el-form-item>
        <p>
          {{ $t('Properties determine the structure of the blueprint.') }}<br>
          {{ $t('Each entity will also have an identifier and a title, regardless of those custom entities.') }}
        </p>
        <EditBlueprintProperties @changed="blueprintProperties = $event"/>
      </el-tab-pane>

      <el-tab-pane :label="$t('On-Save Mapping')" name="mapping">
        <p>
          {{ $t('Properties can be calculated on save.') }}<br>
          {{ $t('Each property key can have JQ calculation for its final data.') }}<br>
          {{ $t('Those calculations will run on our backend, before save for each entity.') }}
        </p>
        <div v-for="(entry, index) in blueprintMapping" :key="index" class="property">
          <FormRowGroup>
            <FormInput v-model="entry.key" title="Key"/>
            <FormInput v-model="entry.value" title="JQ Calculation"/>
            <div class="flex-0 remove-row">
              <RemoveButton @click="blueprintMapping.splice(blueprintMapping.indexOf(entry), 1)"/>
            </div>
          </FormRowGroup>
        </div>
        <AddMore @click="blueprintMapping.push({key: '', value: ''})"/>
      </el-tab-pane>

      <el-tab-pane :label="$t('Properties Relations')" name="relations">
        <p>
          {{ $t('Relations are the logical connection between two or more entities.') }}<br>
          {{ $t('Each relation will have a key and a target.') }}<br>
          {{ $t('The target is the entity that will be connected to the current entity.') }}
        </p>
        <div v-for="(entry, index) in edit.relations" :key="index" class="property">
          <FormRowGroup>
            <FormInput v-model="entry.key" title="Key"/>
            <BlueprintSelector title="Target Blueprint" v-model="entry.target"/>
            <div class="flex-0 remove-row">
              <RemoveButton @click="edit.relations.splice(edit.relations.indexOf(entry), 1)"/>
            </div>
          </FormRowGroup>
        </div>
        <AddMore @click="edit.relations.push({key: '', target: ''})"/>
      </el-tab-pane>

      <el-tab-pane :label="$t('Events Emitting')" name="events">
        <p>
          {{
            $t('Applying this feature will allow you to create webhooks and subscribe to changes made on entities.')
          }}
        </p>
        <FormRowGroup align-start>
          <FormInput v-model="edit.dispatchers.create" title="Create" type="switch" class="flex-0"/>
          <FormInput v-model="edit.dispatchers.update" title="Update" type="switch" class="flex-0"/>
          <FormInput v-model="edit.dispatchers.delete" title="Delete" type="switch" class="flex-0"/>
        </FormRowGroup>
      </el-tab-pane>
    </el-tabs>
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