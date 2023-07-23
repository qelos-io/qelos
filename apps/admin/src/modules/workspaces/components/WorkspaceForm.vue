<template>
  <el-form @submit.native.prevent="submit" class="workspace-form">
    <div class="flex-row">
                <FormInput title="Workspace Name" v-model="data.name" @input="data.name = $event" />
                <FormInput title="Workspace Logo" v-model="data.logo" @input="data.logo = $event" />
              </div>
              <!-- <FormInput title="Workspace InviteList" :model-value="data.invites" @input="data.invites = $event" /> -->
              <span>Workspace InviteList</span>
              <div class="flex-row" v-for="(invite, index) in data.invites" :key="index">
                <FormInput title="Name" v-model="invite.name" @input="invite.name = $event" />
                <FormInput title="Email" v-model="invite.email" @input="invite.email = $event" />
                <button type="button" class="remove-button" @click="removeItem">remove</button>
              </div>
              <div>
                <AddMore @click="addItem" />
              </div>
              <SaveButton class="save-btn" :submitting="submitting">Save</SaveButton>
          </el-form>
</template>

<script lang="ts" setup>
import { computed, reactive } from 'vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import FormInput from '../../core/components/forms/FormInput.vue';
import { clearNulls } from '../../core/utils/clear-nulls';
import AddMore from '../../core/components/forms/AddMore.vue';

const props = defineProps({
  submitting: Boolean
})
const emit = defineEmits(['submitted']);

const data = reactive({
  name: null,
  logo: null,
  invites: [{
    name: null,
    email: null,
  }],
});

function submit() {
  emit('submitted', clearNulls(data))
}

function addItem() {
  data.invites.push({
    name: null,
    email: null,
  })
}

function removeItem(index) {
  data.invites.splice(index, 1)
}

</script>
<style scoped>
.workspace-form {
  margin: 10px;
}

.flex-row>* {
  margin: 10px;
  flex: 1;
}

.remove-button {
  margin-left: 8px;
  margin-top: 45px;
  color: red;
  width: 20px;
  height: 45px;
  background-color: transparent;
  flex-grow: 0.5;
  box-shadow: none;
}

.save-btn {
  margin-left: 8px;
}
</style>
