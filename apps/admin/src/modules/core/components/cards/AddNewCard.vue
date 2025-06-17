<template>
  <div class="add-new-card" @click="handleClick">
    <el-icon class="add-icon"><icon-plus /></el-icon>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const props = defineProps({
  /**
   * Title for the card, e.g. "Create new Plugin"
   */
  title: {
    type: String,
    required: true
  },
  /**
   * Description for the card, e.g. "Add a new plugin to your collection"
   */
  description: {
    type: String,
    required: true
  },
  /**
   * Route to navigate to when clicked
   * Can be a string (route name) or an object with route configuration
   */
  to: {
    type: [String, Object],
    required: true
  }
});

const emit = defineEmits(['click']);

/**
 * Handle click event on the card
 */
const handleClick = () => {
  emit('click');
  router.push(props.to);
};
</script>

<style scoped>
.add-new-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 2px dashed var(--el-color-primary-light-5);
  background-color: rgba(64, 158, 255, 0.05);
  padding: 20px;
  transition: all 0.3s ease;
  cursor: pointer;
  border-radius: 8px;
  height: 100%;
}

.add-new-card:hover {
  background-color: rgba(64, 158, 255, 0.1);
  border-color: var(--el-color-primary);
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.add-icon {
  font-size: 32px;
  color: var(--el-color-primary);
  margin-bottom: 12px;
}

.add-new-card h3 {
  margin: 0 0 8px 0;
  color: var(--el-color-primary);
  font-size: 18px;
  font-weight: 600;
}

.add-new-card p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}
</style>
