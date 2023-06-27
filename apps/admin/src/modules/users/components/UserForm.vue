<template>
  <el-form @submit.native.prevent="submit" class="user-form">
    <div class="flex-row">
      <FormInput title="First Name" :model-value="firstName" @input="editedData.firstName = $event"/>
      <FormInput title="Last Name" :model-value="lastName" @input="editedData.lastName = $event"/>
    </div>
    <FormInput title="Email" :model-value="email" @input="editedData.email = $event"/>
    <el-form-item label="Password">
      <small>Leave empty to ignore changes</small>
      <el-input name="password"
                type="password"
                v-model="editedData.password"/>
    </el-form-item>
    <div v-if="!hideRoles">
      <el-form-item>
        <el-checkbox-group v-model="roles" size="large">
          <el-checkbox v-for="r in availableRoles" :key="r" :label="r" size="large"/>
        </el-checkbox-group>
      </el-form-item>
    </div>
    <textarea v-model="internalMetadata"></textarea>
    <SaveButton :submitting="submitting"/>
  </el-form>
</template>
<script lang="ts">
import {computed, reactive, ref} from 'vue'
import FormInput from '../../core/components/forms/FormInput.vue'
import {clearNulls} from '../../core/utils/clear-nulls'
import {useEditedInputs} from '../../core/compositions/edited-inputs'
import {IUser} from '../../core/store/types/user';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';

export default {
  components: {SaveButton, FormInput},
  props: {
    user: Object as () => IUser,
    hideRoles: Boolean,
    submitting: Boolean,
  },
  setup(props, {emit}) {
    const editedData = reactive({
      firstName: null,
      lastName: null,
      email: null,
      password: null,
      roles: props.user && props.user._id ? null : ['user'],
      internalMetadata: null,
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

    return {
      editedData,
      ...useEditedInputs(editedData, props.user, ['firstName', 'lastName', 'email', 'internalMetadata']),
      roles,
      availableRoles,
      submit() {
        emit('submitted', clearNulls(editedData))
      }
    }
  }
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
