<template>
  <div class="events-filter">
    <el-select
      v-model="selectedKind"
      clearable
      :placeholder="$t('Filter by kind')"
      @change="updateQuery"
      style="width: 200px; margin-right: 10px"
    >
      <el-option
        v-for="kind in uniqueKinds"
        :key="kind"
        :label="kind"
        :value="kind"
      />
    </el-select>

    <el-select
      v-model="selectedEventName"
      clearable
      :placeholder="$t('Filter by event name')"
      @change="updateQuery"
      style="width: 200px; margin-right: 10px"
    >
      <el-option
        v-for="name in uniqueEventNames"
        :key="name"
        :label="name"
        :value="name"
      />
    </el-select>

    <el-select
      v-model="selectedSource"
      clearable
      :placeholder="$t('Filter by source')"
      @change="updateQuery"
      style="width: 200px; margin-right: 10px"
    >
      <el-option
        v-for="source in uniqueSources"
        :key="source"
        :label="source"
        :value="source"
      />
    </el-select>

    <el-select
      v-model="selectedPeriod"
      placeholder="Period"
      @change="updateQuery"
      style="width: 150px"
    >
      <el-option :label="$t('Last Day')" value="last-day" />
      <el-option :label="$t('Last Week')" value="last-week" />
      <el-option :label="$t('Last Month')" value="last-month" />
      <el-option :label="$t('Last Year')" value="last-year" />
      <el-option :label="$t('All Time')" value="all-time" />
    </el-select>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const props = defineProps<{
  uniqueKinds: string[];
  uniqueEventNames: string[];
  uniqueSources: string[];
}>();

const selectedKind = ref<string | undefined>(route.query.kind as string || undefined);
const selectedEventName = ref<string | undefined>(route.query.eventName as string || undefined);
const selectedSource = ref<string | undefined>(route.query.source as string || undefined);
const selectedPeriod = ref<string>(route.query.period as string || 'last-week');

// Watch for route changes to update the selected values
watch(
  () => route.query,
  (newQuery) => {
    selectedKind.value = newQuery.kind as string || undefined;
    selectedEventName.value = newQuery.eventName as string || undefined;
    selectedSource.value = newQuery.source as string || undefined;
    selectedPeriod.value = newQuery.period as string || 'last-week';
  },
  { immediate: true }
);

function updateQuery() {
  router.push({
    name: 'log',
    query: {
      ...route.query,
      kind: selectedKind.value || undefined,
      eventName: selectedEventName.value || undefined,
      source: selectedSource.value || undefined,
      period: selectedPeriod.value,
      page: undefined, // Reset page when filters change
    },
  });
}
</script>

<style scoped lang="scss">
.events-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

@media (max-width: 768px) {
  .events-filter {
    flex-direction: column;
    align-items: stretch;

    .el-select {
      width: 100% !important;
      margin-inline-end: 0 !important;
    }
  }
}
</style>
