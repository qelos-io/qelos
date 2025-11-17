<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { Search, Close } from '@element-plus/icons-vue';
import kebabCase from 'lodash.kebabcase';

// Define the model with defineModel
const model = defineModel<string>('modelValue', {
  type: String,
  default: ''
});

const props = defineProps({
  title: {
    type: String,
    default: 'Icon'
  },
  size: {
    type: String as () => '' | 'default' | 'small' | 'large',
    default: 'default'
  }
});

// Convert PascalCase to kebab-case
function toKebabCase(str: string): string {
  return kebabCase(str);
}

// Convert kebab-case to PascalCase
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

// Search term for filtering icons
const searchTerm = ref('');

// All available Element Plus icons
const allIcons = ref<{ name: string, component: any, kebabName: string }[]>([]);

// Initialize icons
onMounted(() => {
  allIcons.value = Object.entries(ElementPlusIconsVue).map(([name, component]) => {
    return {
      name,
      component,
      kebabName: toKebabCase(name)
    };
  });
});

// Filtered icons based on search term
const filteredIcons = computed(() => {
  if (!searchTerm.value) {
    return allIcons.value;
  }
  
  const lowerSearch = searchTerm.value.toLowerCase();
  return allIcons.value.filter(icon => 
    icon.kebabName.includes(lowerSearch) || 
    icon.name.toLowerCase().includes(lowerSearch)
  );
});

// Selected icon in PascalCase (for display)
const selectedIconComponent = computed(() => {
  if (!model.value) return null;
  
  const pascalCaseName = toPascalCase(model.value);
  return ElementPlusIconsVue[pascalCaseName];
});

// Handle icon selection
function selectIcon(iconName: string) {
  model.value = toKebabCase(iconName);
}

// Clear selected icon
function clearSelection() {
  model.value = '';
}
</script>

<template>
  <el-form-item :label="title">
    <div class="icon-selector">
      <div class="icon-search">
        <el-input
          v-model="searchTerm"
          :placeholder="$t('Search icons...')"
          :size="size"
          clearable
        >
          <template #prefix>
            <el-icon><search /></el-icon>
          </template>
        </el-input>
      </div>
      
      <div class="selected-icon" v-if="model">
        <div class="icon-preview">
          <el-icon v-if="selectedIconComponent" :size="24">
            <component :is="selectedIconComponent" />
          </el-icon>
        </div>
        <div class="icon-name">{{ model }}</div>
        <el-button
          type="danger"
          :size="size"
          circle
          @click="clearSelection"
          class="clear-icon"
        >
          <el-icon><close /></el-icon>
        </el-button>
      </div>
      
      <div class="icons-container">
        <el-scrollbar height="300px">
          <div class="icons-grid">
            <div
              v-for="icon in filteredIcons"
              :key="icon.name"
              class="icon-item"
              :class="{ 'is-selected': model === icon.kebabName }"
              @click="selectIcon(icon.name)"
            >
              <el-icon :size="20">
                <component :is="icon.component" />
              </el-icon>
              <div class="icon-label">{{ icon.kebabName }}</div>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>
  </el-form-item>
</template>

<style scoped>
.icon-selector {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.icon-search {
  margin-bottom: 12px;
}

.selected-icon {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 12px;
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.icon-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 12px;
  background-color: var(--el-color-primary-light-9);
  border-radius: 4px;
  color: var(--el-color-primary);
}

.icon-name {
  flex-grow: 1;
  font-family: monospace;
  font-size: 14px;
}

.clear-icon {
  margin-inline-start: 8px;
}

.icons-container {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.icons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  padding: 12px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-item:hover {
  background-color: var(--el-fill-color-light);
  transform: translateY(-2px);
}

.icon-item.is-selected {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border: 1px solid var(--el-color-primary-light-5);
}

.icon-label {
  margin-top: 6px;
  font-size: 11px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  font-family: monospace;
}
</style>
