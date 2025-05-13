<template>
  <div class="list-page-title">
    <div class="list-page-header">
      <h1 class="title-section">
        <EditComponentBar v-if="$slots.editBar" />
        <slot v-if="$slots.default"/>
        <span v-else>{{ t(title) }}</span>
      </h1>
      <div class="header-content" v-if="$slots.content">
        <slot name="content" />
      </div>
      <el-button 
        v-if="createRoutePath || createRoute || createRouteQuery || onCreate" 
        @click="create" 
        class="add-button"
        type="primary"
        :aria-label="t(createText || 'Create')"
      >
        <el-icon class="el-icon--left"><Plus /></el-icon>
        {{ t(createText || 'Create') }}
      </el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Plus } from '@element-plus/icons-vue';
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
.list-page-title {
  width: 100%;
  margin-bottom: 1.5rem;
}

.list-page-header {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 1rem;
  flex-wrap: nowrap;
}

h1 {
  font-size: var(--large-font-size);
  margin: 0;
  font-weight: 600;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-content {
  display: flex;
  align-items: center;
  flex-grow: 1;
  overflow-x: auto;
  margin: 0 1rem;
}

.content-wrapper {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  width: 100%;
}

.add-button {
  white-space: nowrap;
  transition: transform 0.2s ease;
  margin-left: auto;
  margin-right: 0.5rem;
}

.add-button:hover {
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .list-page-title {
    padding: 0 0.5rem;
  }
  
  .list-page-header {
    flex-wrap: wrap;
  }
  
  .header-content {
    order: 3;
    width: 100%;
    margin: 0.75rem 0 0 0;
    padding: 0 0.5rem 0.5rem 0.5rem;
  }
  
  /* Ensure title doesn't take too much space on mobile */
  .title-section {
    max-width: 65%;
    padding-left: 0.5rem;
  }
  
  /* Make the button more compact on mobile */
  .add-button {
    padding: 8px 12px;
    margin-right: 0.5rem;
  }
}

@media (max-width: 480px) {
  .list-page-title {
    margin-bottom: 1rem;
  }
  
  .title-section {
    font-size: 1.25rem;
  }
}
</style>
