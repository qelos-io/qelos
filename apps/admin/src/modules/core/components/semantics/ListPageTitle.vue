<template>
  <h1 class="title-container">
    <div class="title-section">
      <EditComponentBar/>
      <slot v-if="$slots.default"/>
      <span v-else>{{ t(title) }}</span>
    </div>
    <div class="content-section" :class="{ 'has-content': $slots.content }">
      <div class="content-wrapper">
        <slot name="content" />
      </div>
      <el-button v-if="createRoutePath || createRoute || createRouteQuery || onCreate" @click="create" class="add-button">
        {{ t(createText || 'Create') }}
      </el-button>
    </div>
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
  onCreate: Function,
  createText: String,
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

<style scoped>
.title-container {
  display: flex;
  align-items: center;
  width: 100%;
  flex-wrap: wrap;
  gap: 10px;
}

.title-section {
  display: flex;
  align-items: center;
}

.content-section {
  display: flex;
  align-items: center;
  flex: 1;
  flex-wrap: wrap;
}

.content-wrapper {
  display: flex;
  align-items: center;
  flex-grow: 1;
}

.add-button {
  margin-inline-start: auto;
}

@media (max-width: 768px) {
  .title-container {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .content-section.has-content {
    width: 100%;
    margin-top: 10px;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .content-section.has-content .content-wrapper {
    width: 100%;
    overflow-x: auto;
  }

  .content-section.has-content .add-button {
    margin-inline-start: 0;
  }

  .content-section:not(.has-content) {
    margin-inline-start: auto;
    margin-top: 0;
  }

  .title-container:has(.content-section:not(.has-content)) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
