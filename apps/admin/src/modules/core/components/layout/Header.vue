<template>
  <header :dir="$t('appDirection')">
    <div class="welcome">
      <el-button type="default" class="btn" circle @click="open">
        <el-icon>
          <icon-menu/>
        </el-icon>
      </el-button>

      <el-input
          v-if="route.meta?.searchQuery"
          class="query-input"
          size="large"
          v-model.trim="query"
          :placeholder="$t(route?.meta?.searchPlaceholder as string || 'Search...')"
      />

      <HeaderUserDropdown/>
    </div>
  </header>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import debounce from 'lodash.debounce';
import { useRoute, useRouter } from 'vue-router';
import HeaderUserDropdown from '@/modules/core/components/layout/HeaderUserDropdown.vue';

const emit = defineEmits(['open']);
const router = useRouter()
const route = useRoute()

const tempQuery = ref('')

const query = computed({
  get: () => tempQuery.value || route.query.q?.toString(),
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
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: flex-start;
  height: 50px;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid var(--border-color);
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

.user-dropdown {
  margin-inline-start: auto;
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

.btn {
  margin-inline-start: 10px;
  font-size: 18px;
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
  .btn {
    display: block;
  }
}

.query-input {
  margin-inline: 10px;
  max-width: 300px;
}
</style>
