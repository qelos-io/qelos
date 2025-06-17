<template>
  <div class="tab-content">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <el-icon><font-awesome-icon :icon="['fas', 'code']" /></el-icon>
          <span>{{ $t('Custom Code Injection') }}</span>
        </div>
      </template>
      <p class="card-description">{{$t('The ability to inject any custom HTML / CSS / JS to all the pages.')}}</p>
      
      <div v-for="(inject, index) in plugin.injectables" class="injectable-item" :key="index">
        <FormRowGroup>
          <FormInput class="flex-0" type="switch" v-model="inject.active"/>
          <FormInput title="Name" v-model="inject.name"/>
          <FormInput title="Description" v-model="inject.description"/>
          <div class="flex-0 remove-row">
            <RemoveButton @click="removeInjectable(index)"/>
          </div>
        </FormRowGroup>
        <div class="monaco-container" v-if="inject.active">
          <Monaco v-model="inject.html" language="html"/>
        </div>
      </div>
      
      <AddMore @click="addInjectable" class="add-more-button"/>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { IPlugin } from '@/services/types/plugin';

const props = defineProps<{
  plugin: Partial<IPlugin>;
}>();

function addInjectable() {
  if (!props.plugin.injectables) {
    props.plugin.injectables = [];
  }
  props.plugin.injectables.push({ 
    name: '', 
    description: '', 
    active: true, 
    html: '<!--Custom HTML-->' 
  });
}

function removeInjectable(index: number) {
  props.plugin.injectables?.splice(index, 1);
}
</script>
