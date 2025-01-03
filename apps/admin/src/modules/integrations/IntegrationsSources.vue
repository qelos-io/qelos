<script setup lang="ts">
import { IntegrationSourceKind } from '@qelos/global-types';
import { useIntegrationSources } from '@/modules/integrations/compositions/integration-sources';
import { useRoute } from 'vue-router';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';

const route = useRoute()

const kind = route.params.kind.toString() as IntegrationSourceKind;

const kindData = useIntegrationKinds()[kind];

const { result } = useIntegrationSources(kind);
</script>

<template>
  <h1>
    <img v-if="kindData.logo" class="head-logo" :src="kindData.logo">
    <span>{{ $t('Connections') }}</span>
  </h1>
  {{ result }}
</template>

<style scoped>
h1 {
  align-items: center;
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.head-logo {
  height: 30px;
  margin: 0;
}
</style>