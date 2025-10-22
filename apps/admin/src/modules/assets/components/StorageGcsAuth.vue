<template>
	<form-input-item :label="$t('GCS JSON Key')">
		<el-input type="file" v-model="file" @change.native="setFileData" />
	</form-input-item>
</template>
<script lang="ts" setup>
import { watchEffect, reactive, ref } from 'vue'

const props = defineProps({value: Object})
const emit = defineEmits(['update:modelValue'])

const form = ref(props.value || null)

const file = ref(null)

function getFormInputs() {
	return form.value;
}

watchEffect(() => emit('update:modelValue', getFormInputs()))

function readFile(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.readAsText(file, 'UTF-8')
		reader.onload = function (evt: any) {
			resolve(evt?.target.result)
		}
		reader.onerror = function () {
			reject(new Error('error reading file'))
		}
	})
}
async function setFileData($event: any) {
	if ($event.target.files && $event.target.files[0]) {
		const credentials = JSON.parse(await readFile($event.target.files[0]))

		form.value = credentials || null;
	}
}
</script>
