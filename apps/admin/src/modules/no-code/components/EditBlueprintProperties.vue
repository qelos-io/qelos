<script setup lang="ts">
import { inject, ref, watch } from 'vue';
import { BlueprintPropertyType, IBlueprint } from '@qelos/global-types';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import BlueprintPropertyTypeSelector from '@/modules/no-code/components/BlueprintPropertyTypeSelector.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { getKeyFromName } from '@/modules/core/utils/texts';

const edit = inject<Partial<IBlueprint>>('edit');

const blueprintProperties = ref(
    Object
        .entries(edit.properties || {})
        .map(([key, value]) => ({ key, ...value }))
);

const emit = defineEmits(['changed'])

function addItem() {
  blueprintProperties.value.push({
    key: 'new_item',
    title: '',
    enum: [],
    type: BlueprintPropertyType.STRING,
    description: '',
    required: false,
    multi: false
  })
}

watch(blueprintProperties, () => {
  emit('changed', blueprintProperties.value)
}, { deep: true });
</script>

<template>
  <div v-for="(entry, index) in blueprintProperties" :key="index" class="property">
    <FormRowGroup>
      <FormInput v-model="entry.key" title="Key" required/>
      <FormInput v-model="entry.title" @input="entry.key = getKeyFromName($event)" title="Title" required/>
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
    <FormRowGroup v-if="entry.type === BlueprintPropertyType.NUMBER">
      <FormInput v-model="entry.min" type="number" title="Min"/>
      <FormInput v-model="entry.max" type="number" title="Max"/>
    </FormRowGroup>
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
  <AddMore @click="addItem"/>
</template>

<style scoped>

</style>