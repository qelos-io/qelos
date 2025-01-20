<template>
  <header :dir="$t('appDirection')">
    <div class="welcome">
      <el-button class="mobile-menu-opener" v-if="$isMobile" text circle size="large" @click="open">
        <el-icon>
          <font-awesome-icon :icon="['fas', 'bars']"/>
        </el-icon>
      </el-button>

      <el-input
          v-if="route.meta?.searchQuery"
          class="query-input"
          size="large"
          v-model="query"
          :placeholder="$t(route?.meta?.searchPlaceholder as string || 'Search...')"
      />

      <div v-if="isAdmin && !$isMobile" class="apply-editor" id="edit-mode-toggle">
        <span>
          <el-switch
              v-model="isEditingEnabled"
              active-text="-Edit Mode-"
              inactive-text="-Edit Mode-"
              style="--el-switch-on-color: var(--border-color);"
              size="large"
              inline-prompt
          />
        </span>
      </div>

      <HeaderUserDropdown/>
    </div>
  </header>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import debounce from 'lodash.debounce';
import { useRoute, useRouter } from 'vue-router';
import HeaderUserDropdown from '@/modules/core/components/layout/HeaderUserDropdown.vue';
import { isAdmin, isEditingEnabled } from '@/modules/core/store/auth';

const emit = defineEmits(['open']);
const router = useRouter()
const route = useRoute()

const tempQuery = ref(null)

const query = computed({
  get: () => typeof tempQuery.value === 'string' ? tempQuery.value : route.query.q?.toString(),
  set: (value: string) => {
    tempQuery.value = value;
  }
});

watch(tempQuery, debounce((value: string) => {
  if (value === null) {
    return;
  }
  router.push({ query: { ...route.query, q: value } })
  tempQuery.value = null
}, 500))

const open = () => emit('open');
</script>
<style scoped lang="scss">
header {
  margin: var(--spacing);
  border-radius: 10px;
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: flex-start;
  height: 50px;
  align-items: center;
  background: #fff;
  border: 1px solid var(--border-color);
  box-shadow: 1px 0.5px var(--border-color);
}

.workspace-row {
  color: var(--secondary-color);
}

.welcome {
  width: 100%;
  margin-inline-start: auto;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.user-welcome {
  padding-inline-end: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--main-color);
  font-size: 16px;

  > i {
    margin-inline-start: 5px;
  }
}

.mobile-menu-opener {
  display: none;
}

a {
  text-decoration: none;
  border: 0;
  text-align: right;
  height: 100%;
  cursor: pointer;
  color: var(--main-color);

  &:hover {
    text-decoration: underline;
  }
}

.actions {
  margin-inline-start: auto;
  margin-inline-end: 10px;
}

.quick-action {
  font-size: 1.3em;
  padding: 5px;
  height: auto;
  border: 0;
}

.quick-action:hover {
  color: white;
}

@media (max-width: 600px) {
  .mobile-menu-opener {
    display: block;
  }
}

.query-input {
  margin-inline: 10px;
  max-width: 300px;
}

.apply-editor {
  text-align: center;
  margin-inline: auto 10px;
}
</style>
