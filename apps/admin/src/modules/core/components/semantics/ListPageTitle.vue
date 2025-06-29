<template>
  <div class="list-page-title">
    <div class="list-page-header">
      <h1 class="title-section">
        <EditComponentBar v-if="$slots.editBar" />
        <slot v-if="$slots.default"/>
        <span v-else>{{ t(title) }}</span>
        <el-tooltip 
          v-if="description && !$isMobile" 
          :content="t(description)" 
          placement="top"
          effect="dark"
          :show-after="200"
          :hide-after="100"
        >
          <el-button 
            class="help-button" 
            size="small" 
            circle 
            text
            :aria-label="t('Show help for this page')"
          >
            <el-icon><QuestionFilled /></el-icon>
          </el-button>
        </el-tooltip>
        <el-button 
          v-if="description && $isMobile"
          @click="showHelpMessage"
          class="help-button" 
          size="small" 
          circle 
          text
          :aria-label="t('Show help for this page')"
        >
          <el-icon><QuestionFilled /></el-icon>
        </el-button>
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
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Plus, QuestionFilled } from '@element-plus/icons-vue';
import EditComponentBar from '@/modules/no-code/components/EditComponentBar.vue';

const router = useRouter();
const { t } = useI18n();

const emit = defineEmits(['create', 'removeComponent']);

const props = defineProps({
  title: String,
  description: String,
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

function showHelpMessage() {
  if (props.description) {
    ElMessageBox.alert(t(props.description), t('Page Information'), {
      confirmButtonText: t('Got it'),
      type: 'info',
      center: true,
    });
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
  overflow: hidden;
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
  flex: 1;
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

.help-button {
  margin-left: 0.5rem;
  color: var(--el-color-info);
  font-size: 16px;
  padding: 4px;
  min-height: 24px;
  width: 24px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.help-button:hover {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  transform: scale(1.1);
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
  
  /* Ensure proper mobile layout */
  .list-page-header {
    gap: 0.5rem;
  }
  
  .title-section {
    padding-left: 0.5rem;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  
  .title-section h1,
  .title-section span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  /* Make help button smaller on mobile */
  .help-button {
    margin-left: 0.25rem;
    min-height: 20px;
    width: 20px;
    font-size: 14px;
    padding: 2px;
    flex-shrink: 0;
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
  
  .list-page-header {
    gap: 0.25rem;
  }
  
  .title-section {
    font-size: 1.25rem;
    flex: 1;
    min-width: 0;
  }
  
  /* Even smaller help button on very small screens */
  .help-button {
    margin-left: 0.2rem;
    min-height: 18px;
    width: 18px;
    font-size: 12px;
    padding: 1px;
    flex-shrink: 0;
  }
}
</style>
