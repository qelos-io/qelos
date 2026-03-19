<template>
  <div class="events-log-page">
    <div class="header-container">
      <ListPageTitle title="Events Log">
        <template v-slot:content>
          <EventsFilter
            :unique-kinds="uniqueKinds"
            :unique-event-names="uniqueEventNames"
            :unique-sources="uniqueSources"
            :filter-options-loading="filterOptionsLoading"
            :period="filters.period"
            :from="filters.from"
            :to="filters.to"
            :current-page="filters.page"
            :total="total"
            :total-pages="totalPages"
            :total-capped="totalCapped"
            :loading="loading"
          />
        </template>
      </ListPageTitle>
    </div>

    <EventsList
      :events="events"
      :loading="loading"
      :total="total"
      :total-capped="totalCapped"
      :total-pages="totalPages"
      :limit="limit"
      :current-page="filters.page"
    />
  </div>
</template>

<script lang="ts" setup>
import EventsList from './components/EventsList.vue';
import EventsFilter from './components/EventsFilter.vue';
import ListPageTitle from '../core/components/semantics/ListPageTitle.vue';
import { useEventsList } from './compositions/events';

const {
  events,
  loading,
  total,
  totalCapped,
  totalPages,
  limit,
  uniqueKinds,
  uniqueEventNames,
  uniqueSources,
  filterOptionsLoading,
  filters,
} = useEventsList();
</script>

<style scoped lang="scss">
.events-log-page {
  padding: 20px;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .events-log-page {
    padding: 10px;
  }

  .header-container {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
