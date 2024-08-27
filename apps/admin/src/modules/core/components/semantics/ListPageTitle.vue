<template>
  <h1 class="title-container">
    <RemoveButton v-if="editableManager" class="remove-component-btn" @click="editableManager.removeComponent($el)" />
    <span>{{ $t(title) }}</span>
    <slot name="content"></slot>
    <el-button v-if="createRoutePath || createRoute || onCreate" @click="create" class="add-button">
      {{ $t('Create') }}
    </el-button>
  </h1>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { inject } from 'vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';

const router = useRouter();
const emit = defineEmits(['create', 'removeComponent']);

const props = defineProps({
  title: String,
  createRoute: String,
  createRoutePath: String,
  onCreate: Function
});

function create() {
  if (props.onCreate) {
    emit('create');
  } else {
    router.push(props.createRoutePath || { name: props.createRoute });
  }
}

const editableManager = inject('editableManager');
</script>

<style scoped lang="scss">
.title-container {
  display: flex;
  align-items: center;
  width: 100%;
}

.add-button {
  margin-inline-start: auto;
}
</style>
