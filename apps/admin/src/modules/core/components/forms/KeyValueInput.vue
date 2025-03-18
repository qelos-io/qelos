<template>
	<el-form-item :label="title">
		<div class="key-value-container">
			<div v-for="(item, index) in localValue" :key="index" class="key-value-pair">
				<el-input v-model="item.key" placeholder="Key" class="key-input" @input="emitChange" />
				<el-input v-model="item.value" placeholder="Value" class="value-input" @input="emitChange" />
				<div class="buttons">
					<RemoveButton v-if="localValue.length > 1" type="danger" @click="removePair(index)">-</RemoveButton>
					<el-button v-if="index === localValue.length - 1" type="primary" @click="addPair">+</el-button>
				</div>
			</div>
		</div>
	</el-form-item>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, watch, onMounted } from 'vue';
import RemoveButton from './RemoveButton.vue';

const props = defineProps<{
	title: string;
	modelValue: Record<string, string>;
}>();

const emit = defineEmits(['update:modelValue', 'change']);

const localValue = ref<{ key: string; value: string }[]>([]);

// Sync localValue with modelValue
const syncFromModel = () => {
	localValue.value =
		props.modelValue && Object.keys(props.modelValue).length > 0
			? Object.entries(props.modelValue).map(([key, value]) => ({ key, value: value as string }))
			: [{ key: '', value: '' }];
};

// Initial sync when component mounts
onMounted(syncFromModel);

// Add new key-value pair
const addPair = () => {
	localValue.value.push({ key: '', value: '' });
};

// Remove key-value pair by index
const removePair = (index: number) => {
	if (localValue.value.length > 1) {
		localValue.value.splice(index, 1);
		emitChange();
	}
};

// Emit updated data to parent component
const emitChange = () => {
	emit(
		'update:modelValue',
		Object.fromEntries(localValue.value.map(({ key, value }) => [key, value]))
	);
	emit('change', localValue.value);
};

// Watch for modelValue changes and sync localValue
watch(() => props.modelValue, syncFromModel, { deep: true, immediate: true });
</script>

<style scoped>
.key-input,
.value-input {
	height: 38px;
}

.key-value-container {
	display: flex;
	flex-direction: column;
	gap: 18px;
	width: 100%;
}

.key-value-pair {
	display: flex;
	align-items: center;
	gap: 8px;
}

.key-input,
.value-input {
	flex: 1;
}

.buttons {
	display: flex;
	gap: 4px;
}

.buttons button {
	padding: 8px 12px;
}
</style>
