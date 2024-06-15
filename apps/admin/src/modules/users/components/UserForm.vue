<template>
  <el-form @submit.native.prevent="submit" class="user-form">
    <EditHeader><slot/></EditHeader>
    <div class="flex-row">
      <FormInput title="First Name" :model-value="firstName" @input="editedData.firstName = $event"/>
      <FormInput title="Last Name" :model-value="lastName" @input="editedData.lastName = $event"/>
    </div>
    <FormInput title="Username / Email" :disabled="!asAdmin" :model-value="username" @input="editedData.username = $event"/>
    <el-form-item label="Password">
      <small>Leave empty to ignore changes</small>
      <el-input name="password" type="password" v-model="editedData.password"/>
    </el-form-item>
    <div v-if="!hideRoles">
      <el-form-item>
        <el-checkbox-group v-model="roles" size="large">
          <el-checkbox v-for="r in availableRoles" :key="r" :label="r" size="large"/>
        </el-checkbox-group>
      </el-form-item>
    </div>
    <el-form-item label="Meta data" v-if="asAdmin">
      <Monaco :model-value="internalMetadata" @input="editedData.internalMetadata = $event.target.value"/>
    </el-form-item>

    <SaveButton :submitting="submitting"/>
  </el-form>
</template>
<script lang="ts" setup>
import { computed, reactive } from 'vue'
import FormInput from '../../core/components/forms/FormInput.vue'
import { clearNulls } from '../../core/utils/clear-nulls'
import { useEditedInputs } from '../../core/compositions/edited-inputs'
import { IUser } from '../../core/store/types/user';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import Monaco from './Monaco.vue';
import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';

const props = defineProps({
  user: Object as () => IUser,
  hideRoles: Boolean,
  submitting: Boolean,
  asAdmin: Boolean
})
const emit = defineEmits(['submitted']);

const editedData = reactive({
  firstName: null,
  lastName: null,
  username: null,
  password: null,
  roles: props.user && props.user._id ? null : ['user'],
  internalMetadata: props.user.internalMetadata ? JSON.stringify(props.user.internalMetadata, null, 2) : null
});

let roles;
let availableRoles;

if (!props.hideRoles) {
  roles = computed<Array<string>>({
    get: () => editedData.roles || props.user.roles || [],
    set: (roles) => editedData.roles = roles
  });
  availableRoles = Array.from(new Set(['admin', 'editor', 'plugin', 'user'].concat(props.user.roles || [])));
}

const {
  firstName,
  lastName,
  username,
  internalMetadata
} = useEditedInputs(editedData, props.user, ['firstName', 'lastName', 'username', 'internalMetadata'])

function submit() {
  editedData.internalMetadata = JSON.parse(editedData.internalMetadata);
  emit('submitted', clearNulls(editedData))
}
</script>
<style scoped>
.user-form {
  margin: 10px;
}

.flex-row > * {
  margin: 10px;
  flex: 1;
}
</style>
