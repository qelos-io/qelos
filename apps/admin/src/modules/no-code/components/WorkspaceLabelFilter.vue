<script setup lang="ts">
import { defineProps, defineEmits, ref, watch } from 'vue';

const props = defineProps<{
  modelValue: string[];
  availableLabels: string[];
  placeholder?: string;
  title?: string;
}>();

const emit = defineEmits(['update:modelValue']);

const localValue = ref(props.modelValue);

// Synchronize local variable with `modelValue` from props
watch(() => props.modelValue, (newVal) => {
  localValue.value = newVal;
});

// Emit the change back to the parent component when `localValue` is updated
watch(localValue, (newVal) => {
  emit('update:modelValue', newVal);
});
</script>

<template>
    <el-form-item>
        <template #label>{{ title || 'Workspace Labels Filter' }}</template> 
        <el-select
            v-model="localValue" 
            multiple
            placeholder="Choose labels" 
            title="Workspace Labels Filter"
            class="styled-select"
        >
            <el-option 
                v-for="label in props.availableLabels"
                :key="label"
                :label="label"
                :value="label"
            />
        </el-select>
    </el-form-item>
</template>

<style lang="scss" scoped>
/* .styled-select {
    width: 300px; 
 
  margin-right: 50px ;
    
} */
.styled-select {
  width: 100%; 
  margin-right: 50px; 
}

</style>

