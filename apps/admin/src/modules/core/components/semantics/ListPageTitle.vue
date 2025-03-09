<template>
  <h1 class="title-container">
    <EditComponentBar/>
    <slot v-if="$slots.default"/>
    <span v-else>{{ t(title) }}</span>
    <slot name="content" />
    <el-button v-if="createRoutePath || createRoute || createRouteQuery || onCreate" @click="create" class="add-button">
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
  createRouteQuery: Object,
  onCreate: Function
});

function create() {
  if (props.onCreate) {
    emit('create');
  } else if (props.createRoutePath) {
    router.push(props.createRoutePath);
  } else {
    const to: any = {}
    if (props.createRoute) {
      to.name = props.createRoute;
    } if (props.createRouteQuery) {
      to.query = props.createRouteQuery;
    }
    router.push(to);
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
