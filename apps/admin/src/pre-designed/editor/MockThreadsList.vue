<template>
  <div class="mock-threads-list">
    <div class="threads-list-header">
      <h3>Chat Threads</h3>
      <el-button type="primary" size="small">Create New Thread</el-button>
    </div>
    
    <div class="threads-grid">
      <div v-for="i in 3" :key="i" class="thread-card">
        <div class="thread-header">
          <h4>Sample Thread {{ i }}</h4>
          <el-button type="danger" size="small" text>
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        
        <div class="thread-meta">
          <span>12/10/2025 10:00</span>
          <span>5 messages</span>
        </div>
        
        <div class="thread-preview">
          <p>This is a preview of the last message in the thread...</p>
        </div>
      </div>
    </div>
    
    <div class="pagination-wrapper">
      <el-pagination layout="prev, pager, next" :total="25" :page-size="10" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Delete } from '@element-plus/icons-vue'
</script>

<style scoped>
.mock-threads-list {
  width: 100%;
  padding: 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
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

.threads-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.thread-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
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
  margin-right: 8px;
}

.thread-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.thread-preview {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.thread-preview p {
  margin: 0;
  line-height: 1.4;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
