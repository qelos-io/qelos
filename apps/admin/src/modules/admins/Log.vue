<template>
  <div class="events-log-page">
    <div class="header-container">
      <ListPageTitle title="Events Log">
        <template v-slot:content>
          <EventsFilter
            :unique-kinds="uniqueKinds"
            :unique-event-names="uniqueEventNames"
            :unique-sources="uniqueSources"
          />
        </template>
      </ListPageTitle>
    </div>

    <EventsList :events="events" :loading="loading" />
  </div>
</template>

<script lang="ts" setup>
import EventsList from './components/EventsList.vue';
import EventsFilter from './components/EventsFilter.vue';
import ListPageTitle from '../core/components/semantics/ListPageTitle.vue';
import { useEventsList } from './compositions/events';

const { events, loading, uniqueKinds, uniqueEventNames, uniqueSources } = useEventsList();
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
