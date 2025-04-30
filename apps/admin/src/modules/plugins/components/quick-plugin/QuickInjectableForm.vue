<script setup lang="ts">
import {  ref } from 'vue';
import { IPlugin } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';

const emit = defineEmits(['changed']);

const plugin = ref<Partial<IPlugin>>({
  name: 'analytics',
  injectables: [
    {active: true, html: '', name: 'google analytics'}
  ]
});

function emitChange() {
  plugin.value.name = plugin.value.injectables[0].name + ' script';
  emit('changed', plugin.value);
}
</script>
<template>
  <FormInput title="Script Name" v-model="plugin.injectables[0].name" required @update:model-value="emitChange"/>
  <Monaco v-model="plugin.injectables[0].html" language="html" @input="emitChange"/>
</template>