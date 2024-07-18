<script setup lang="ts">

import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';
import { provide, ref, toRef } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';

const emit = defineEmits(['save', 'close'])

const props = defineProps<{
  pageName: string,
  mfe: any,
  submitting: boolean
}>()

provide('submitting', toRef(props, 'submitting'))

const openCodeSection = ref('1');

const editedRequirements = ref('')
const htmlEditor = ref()
const requirementsEditor = ref()
editedRequirements.value = JSON.stringify(props.mfe.requirements.map(req => {
  return {
    ...req,
    _id: undefined,
  }
}), null, 2);

function save() {
  emit('save', {
    structure: props.mfe.structure,
    requirements: JSON.parse(editedRequirements.value)
  });
}
</script>

<template>
  <el-form @submit.prevent="save">
    <EditHeader>
      {{ $t('Edit Screen') }}<strong>{{ pageName }}</strong>
      <template #buttons>
        <el-button @click="$emit('close')">Close</el-button>
      </template>
    </EditHeader>
    <el-collapse accordion v-model="openCodeSection">
      <el-collapse-item name="1">
        <template #title>
          <h3>{{ $t('HTML') }}</h3>
        </template>
        <Monaco v-if="openCodeSection === '1'"
                ref="htmlEditor"
                v-model="mfe.structure"
                @keyup="mfe.structure = htmlEditor.getMonaco().getValue()"
                language="html"
                style="min-height:65vh"/>
      </el-collapse-item>
      <el-collapse-item name="2">
        <template #title>
          <h3>{{ $t('Requirements') }}</h3>
        </template>
        <Monaco v-if="openCodeSection === '2'"
                ref="requirementsEditor"
                v-model="editedRequirements"
                language="json"
                @keyup="editedRequirements = requirementsEditor.getMonaco().getValue()"
                style="min-height:65vh"/>
      </el-collapse-item>
    </el-collapse>
  </el-form>
</template>