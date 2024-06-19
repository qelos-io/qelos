<script setup lang="ts">
import { provide, reactive, ref, toRef, watch } from 'vue';
import { BlueprintPropertyType, EntityIdentifierMechanism, IBlueprint } from '@qelos/global-types';
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

const blueprintProperties = ref(
    Object
        .entries(edit.properties || {})
        .map(([key, value]) => ({ key, ...value }))
);

const blueprintMapping = ref(
    Object
        .entries(edit.updateMapping || {})
        .map(([key, value]) => ({ key, value }))
);

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
          <div v-for="(entry, index) in blueprintProperties" :key="index" class="property">
            <FormRowGroup>
              <FormInput v-model="entry.key" title="Key" required/>
              <FormInput v-model="entry.title" title="Title" required/>
              <BlueprintPropertyTypeSelector v-model="entry.type"/>
            </FormRowGroup>
            <FormInput v-model="entry.description" title="Description"/>
            <el-form-item v-if="entry.type === BlueprintPropertyType.STRING" :label="$t('Enum')">
              <el-select
                  v-model="entry.enum"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  :reserve-keyword="false"
                  :placeholder="$t('Enter valid options')"
              >
                <el-option v-for="item in entry.enum" :key="item" :label="item" :value="item"/>
              </el-select>
            </el-form-item>
            <FormRowGroup>
              <FormInput v-model="entry.required" title="Required" type="switch" class="flex-0"/>
              <FormInput v-model="entry.multi" title="Multi" type="switch" class="flex-0"/>
              <template v-if="entry.type === BlueprintPropertyType.STRING">
                <FormInput v-model="entry.max" title="Max Length" type="number" class="flex-0"/>
              </template>
              <div class="flex-0 remove-row">
                <RemoveButton @click="blueprintProperties.splice(blueprintProperties.indexOf(entry), 1)"/>
              </div>
            </FormRowGroup>
          </div>
          <AddMore
              @click="blueprintProperties.push({key: 'new_item', title: '', enum: [], type: BlueprintPropertyType.STRING, description: '', required: false, multi: false})"/>
        </el-collapse-item>

        <el-collapse-item name="3">
          <template #title>
            <h3>{{ $t('On-Save Mapping') }}</h3>
          </template>
          <p>
            {{ $t('Properties can be calculated on save.') }}<br>
            {{ $t('Each property key can have JQ calculation for its final data.') }}<br>
            {{ $t('Those calculations will run on our backend, before save for each entity.') }}
          </p>
          <div v-for="(entry, index) in blueprintMapping" :key="index" class="property">
            <FormRowGroup>
              <FormInput v-model="entry.key" title="Key" class="flex-0"/>
              <FormInput v-model="entry.value" title="JQ Calculation"/>
              <div class="flex-0 remove-row">
                <RemoveButton @click="blueprintMapping.splice(blueprintMapping.indexOf(entry), 1)"/>
              </div>
            </FormRowGroup>
          </div>
          <AddMore @click="blueprintMapping.push({key: '', value: ''})"/>
        </el-collapse-item>

        <el-collapse-item name="4">
          <template #title>
            <h3>{{ $t('Properties Relations') }}</h3>
          </template>
          <p>
            {{ $t('Relations are the logical connection between two or more entities.') }}<br>
            {{ $t('Each relation will have a key and a target.') }}<br>
            {{ $t('The target is the entity that will be connected to the current entity.') }}
          </p>
          <div v-for="(entry, index) in blueprint.relations" :key="index" class="property">
            <FormRowGroup>
              <FormInput v-model="entry.key" title="Key" class="flex-0"/>
              <FormInput v-model="entry.target" title="Target Blueprint"/>
              <div class="flex-0 remove-row">
                <RemoveButton @click="blueprint.relations.splice(blueprint.relations.indexOf(entry), 1)"/>
              </div>
            </FormRowGroup>
          </div>
          <AddMore @click="blueprint.relations.push({key: '', target: ''})"/>
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