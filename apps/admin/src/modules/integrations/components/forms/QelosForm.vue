<script setup lang="ts">
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import { IntegrationSourceKind, IQelosSource } from '@qelos/global-types';
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
	modelValue: {
		type: Object as () => IQelosSource,
	},
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);
const formModel = ref({ ...props.modelValue, kind: IntegrationSourceKind.Qelos });
const availableLabels = ['supplier', 'store', 'consumer'];
const rules = {
	name: [{ required: true, message: 'Name is required', trigger: 'blur' }],
	'authentication.password': [{ required: true, message: 'Password is required', trigger: 'blur' }],
	'metadata.url': [{ required: true, message: 'URL is required', trigger: 'blur' }],
	'metadata.username': [{ required: true, message: 'Username is required', trigger: 'blur' }],
};

const submitForm = () => {
	emit('submit', formModel.value);
};
</script>

<template>
	<el-form :model="formModel" :rules="rules" ref="formRef">
		<FormInput v-model="formModel.name" title="Name" />
		<LabelsInput v-model="formModel.labels" :availableLabels="availableLabels" title="Labels">
			<el-option v-for="label in availableLabels" :key="label" :label="label" :value="label" />
		</LabelsInput>
		<FormInput v-model="formModel.metadata.username" title="Username" />
		<FormInput v-model="formModel.metadata.url" title="URL" />
		<FormInput v-model="formModel.authentication.password" type="password" title="Password" class="w-full" />
		<el-form-item>
			<el-button type="primary" @click="submitForm">{{ $t('Save') }}</el-button>
			<el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
		</el-form-item>
	</el-form>
</template>
