<template>
  <div class="threads-list">
    <slot v-if="$slots.header" name="header" v-bind="{ title, createThread }" />
    <div class="threads-list-header" v-else-if="showHeader">
      <h3>{{ title }}</h3>
      <el-button
        v-if="allowCreate"
        class="create-thread-btn"
        type="primary"
        size="small"
        @click="createThread"
      >
        {{ $t('Create New Thread') }}
      </el-button>
    </div>
    
    <div v-loading="loading" class="threads-content">
      <el-empty
        v-if="!loading && threads.length === 0"
        description="No threads found"
        :image-size="100"
      />
      
      <div v-else class="threads-grid">
        <div
          v-for="thread in threads"
          :key="thread._id"
          class="thread-card"
          :class="{ 'selected': selectedThreadId === thread._id }"
          @click="selectThread(thread)"
        >
          <div class="thread-header">
            <h4 class="thread-title">{{ thread.title || 'Untitled Thread' }}</h4>
            <el-button
              v-if="allowDelete"
              type="danger"
              size="small"
              text
              @click.stop="deleteThread(thread)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          
          <div class="thread-meta">
            <span class="thread-date">{{ formatDate(thread.updated || thread.created) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import sdk from '@/services/sdk';
import { IThread } from '@qelos/sdk/ai';

interface Props {
  title?: string
  showHeader?: boolean
  allowCreate?: boolean
  allowDelete?: boolean
  integration?: string
  limit?: number | string
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Threads',
  showHeader: true,
  allowCreate: true,
  allowDelete: true,
  limit: 20,
  autoLoad: true
})
const selectedThreadId = defineModel<string>('selected', {
  type: String,
  default: ''
})

// Convert limit to number if it's a string
const limitNumber = computed(() => typeof props.limit === 'string' ? parseInt(props.limit, 10) : props.limit)

const emit = defineEmits<{
  'create-thread': [thread?: IThread]
  'select-thread': [thread: IThread]
  'thread-deleted': [threadId: string]
}>()

const loading = ref(false)
const threads = ref<IThread[]>([])

const loadThreads = async () => {
  loading.value = true  
  try {
    const query: any = {
      limit: limitNumber.value,
      sort: '-updated'
    };
    if (props.integration) {
      query.integration = props.integration;
    }
    const response = await sdk.ai.threads.list(query)
    
    threads.value = response
  } catch (error) {
    console.error('Failed to load threads:', error)
    ElMessage.error('Failed to load threads')
  } finally {
    loading.value = false
  }
}

const deleteThread = async (thread: IThread) => {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to delete this thread?',
      'Delete Thread',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )
    
    await sdk.ai.threads.delete(thread._id!)
    ElMessage.success('Thread deleted successfully')
    emit('thread-deleted', thread._id!)
    loadThreads();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete thread:', error)
      ElMessage.error('Failed to delete thread')
    }
  }
}

const formatDate = (date: Date | string) => {
  const d = new Date(date)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function createThread() {
  let thread: IThread;
  if (props.integration) {
    thread = await sdk.ai.threads.create({integration: props.integration});
  }
  emit('create-thread', thread!);
  loadThreads();
}

function selectThread(thread: IThread) {
  selectedThreadId.value = thread._id;
  emit('select-thread', thread);
}

defineExpose({
  loadThreads,
  selectThread,
})

onMounted(() => {
  if (props.autoLoad) {
    loadThreads()
  }
})
</script>

<style scoped>
.threads-list {
  width: 100%;
}

.threads-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.threads-list-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.threads-content {
  min-height: 200px;
}

.threads-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.thread-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--el-bg-color);
}

.thread-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.thread-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.thread-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  flex: 1;
  margin-inline-end: 8px;
}

.thread-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

@media (max-width: 768px) {
  .threads-grid {
    grid-template-columns: 1fr;
  }
  
  .threads-list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
