<template>
	<form-input-item :label="$t('GCS JSON Key')">
		<el-input type="file" v-model="file" @change.native="setFileData" />
	</form-input-item>
</template>
<script lang="ts" setup>
import { watchEffect, reactive, ref } from 'vue'

const props = defineProps({value: Object})
const emit = defineEmits(['update:modelValue'])

const form = reactive({
	projectId: '',
	clientEmail: '',
	privateKey: '',
})

const file = ref(null)

if (props.value) {
	form.projectId = props.value.projectId
	form.clientEmail = props.value.clientEmail
	form.privateKey = props.value.privateKey
}

function getFormInputs({ projectId, clientEmail, privateKey }) {
	return { projectId, clientEmail, privateKey };
}

watchEffect(() => emit('update:modelValue', getFormInputs(form)))

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
async function setFileData($event) {
	if ($event.target.files && $event.target.files[0]) {
		const {
			project_id: projectId,
			private_key: privateKey,
			client_email: clientEmail
		} = JSON.parse(await readFile($event.target.files[0]))

		form.projectId = projectId
		form.privateKey = privateKey
		form.clientEmail = clientEmail
	}
}
</script>
