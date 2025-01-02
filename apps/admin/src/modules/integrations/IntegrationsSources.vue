<script setup lang="ts">
import { IntegrationSourceKind } from '@qelos/global-types';
import { useIntegrationSources } from '@/modules/integrations/compositions/integration-sources';
import { useRoute } from 'vue-router';

const route = useRoute()

const kind = route.params.kind.toString() as IntegrationSourceKind;
const { result } = useIntegrationSources(kind);
</script>

<template>
  <h1>{{ $t('Integrations Connections') }}</h1>
  {{ result }}
</template>