<template>
  <h1 class="title-container">
    <EditComponentBar/>
    <span>{{ t(title) }}</span>
    <slot name="content"></slot>
    <el-button v-if="createRoutePath || createRoute || onCreate" @click="create" class="add-button">
      {{ t('Create') }}
    </el-button>
  </h1>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import EditComponentBar from '@/modules/no-code/components/EditComponentBar.vue';

const router = useRouter();
const { t } = useI18n();

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
