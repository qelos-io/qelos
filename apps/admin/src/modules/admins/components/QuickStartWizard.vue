<script setup lang="ts">
import { onBeforeMount, ref, toRefs } from 'vue';
import { useToursStore } from '@/modules/core/store/tours';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

const formVisible = ref(false);
const step = ref(0)
const quickStartForm = ref({
  name: '',
  logo: '',
  description: '',
  activateWorkspace: false,
  openAiToken: ''
});

const toursStore = useToursStore();
onBeforeMount(async () => {
  await toursStore.setCurrentTour('quick-start', 1);
  formVisible.value = toursStore.tourOpen;
});

const { appConfig, promise: appConfigPromise } = useAppConfiguration();
const { isActive, promise: wsConfigPromise } = toRefs(useWsConfiguration());
onBeforeMount(async () => {
  await Promise.all([appConfigPromise, wsConfigPromise.value]);
  quickStartForm.value.name = appConfig.value.name;
  quickStartForm.value.logo = appConfig.value.logoUrl;
  quickStartForm.value.activateWorkspace = isActive.value;
});

function closeForm() {
  if (toursStore.tourOpen) {
    toursStore.tourFinished();
  }
}

function save() {
  // store name and logo in app config
  // store open ai token as an integration source kind: openAI
  // store activate workspace in ws config
  // if the workspace is activated - check if there are labels and if not - add default label: "Basic" label.

  // use the description to create a blueprints and pages in no-code-completion api.
}
</script>

<template>
  <div><el-button text @click="formVisible = true">Quick Tour</el-button></div>
  <el-dialog append-to-body v-model="formVisible" :title="$t('Quick Start')"
             width="50%"
             @close="closeForm">
    <el-steps :active="step" finish-status="success">
      <el-step title="Basic Information"/>
      <el-step title="Operations and Behavior"/>
      <el-step title="Summary"/>
    </el-steps>

    <div v-if="step === 0">
      <FormInput v-model="quickStartForm.name" title="Your App Name" />
      <FormRowGroup align-center>
        <FormInput v-model="quickStartForm.logo" title="Your App Logo" />
        <img :src="quickStartForm.logo" class="flex-0" style="background-color: var(--nav-bg-color);">
      </FormRowGroup>
    </div>
    <div v-else-if="step === 1">
      <FormInput v-model="quickStartForm.openAiToken" type="password" title="OpenAI Token" />
      <p>Describe what your app is doing in one sentence:</p>
      <FormInput v-model="quickStartForm.description" type="textarea" />
      <FormInput v-model="quickStartForm.activateWorkspace" type="switch" title="Activate Workspaces?" />
    </div>
    <div v-else-if="step === 2">
      <p><strong>{{ $t('Application Name') }}</strong>: {{ quickStartForm.name }}</p>
      <p><strong>{{ $t('Application Logo') }}</strong>:<br><img :src="quickStartForm.logo" class="flex-0" style="background-color: var(--nav-bg-color);"></p>
      <p><strong>{{ $t('Workspaces') }}</strong>: {{ quickStartForm.activateWorkspace ? $t('Enabled') : $t('Disabled') }}</p>
      <p><strong>{{ $t('Description') }}</strong>: {{ quickStartForm.description }}</p>
    </div>
    <template #footer>
      <el-button @click="formVisible = false">Cancel</el-button>
      <el-button type="primary" @click="step--" v-if="step > 0">Back</el-button>
      <el-button type="primary" @click="step++" v-if="step < 2">Next</el-button>
      <el-button type="primary" @click="save" v-if="step === 2">Done</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
img {
  max-height: 50px;
  max-width: 100px;
}
</style>