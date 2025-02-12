<script setup lang="ts">
import { onBeforeMount, ref } from 'vue';
import { useToursStore } from '@/modules/core/store/tours';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';

const formVisible = ref(false);
const step = ref(0)
const quickStartForm = ref({
  name: '',
  logo: '',
  description: ''
});

const toursStore = useToursStore();
onBeforeMount(async () => {
  await toursStore.setCurrentTour('quick-start', 1);
  formVisible.value = toursStore.tourOpen;
});

const { appConfig, promise: appConfigPromise } = useAppConfiguration();
onBeforeMount(async () => {
  await appConfigPromise;
  quickStartForm.value.name = appConfig.value.name;
  quickStartForm.value.logo = appConfig.value.logoUrl;
});

function closeForm() {
  if (toursStore.tourOpen) {
    toursStore.tourFinished();
  }
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
        <img :src="quickStartForm.logo" class="flex-0">
      </FormRowGroup>
    </div>
    <div v-if="step === 1">
      <p>Describe what your app is doing in one sentence:</p>
      <FormInput v-model="quickStartForm.description" type="textarea" />
    </div>
    <template #footer>
      <el-button @click="formVisible = false">Cancel</el-button>
      <el-button type="primary" @click="step--" v-if="step > 0">Back</el-button>
      <el-button type="primary" @click="step++" v-if="step < 2">Next</el-button>
      <el-button type="primary" @click="step++" v-if="step === 2">Done</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
img {
  max-height: 50px;
  max-width: 100px;
}
</style>