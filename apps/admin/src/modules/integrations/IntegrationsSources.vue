<script setup lang="ts">
import { IntegrationSourceKind } from '@qelos/global-types';
import { useIntegrationSources } from '@/modules/integrations/compositions/integration-sources';
import { useRoute } from 'vue-router';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import { useIntegrationKindsColumns } from '@/modules/integrations/compositions/integration-kinds-columns';

const route = useRoute()

const kind = route.params.kind.toString() as IntegrationSourceKind;

const kindData = useIntegrationKinds()[kind];

const { result } = useIntegrationSources(kind);

const columns = [
  {
    prop: 'name',
    label: 'Name'
  },
  {
    prop: 'labels',
    label: 'Labels'
  },
  ...useIntegrationKindsColumns()[kind]
];

// TODO: qelos integration form should result with this interface:
// {
//  kind: 'qelos', name: '',
//  labels: [''],
//  metadata: { external: true, url: 'https://..' },
//  authentication: { password: 'aaa' }
// }
</script>

<template>
  <h1>
    <img v-if="kindData.logo" class="head-logo" :alt="kindData.name" :src="kindData.logo">
    <span>{{ $t('Connections') }}</span>
  </h1>
  <QuickTable :data="result" :columns="columns">
    <template #labels="{ row }">
      <el-tag v-for="label in row.labels" :key="label" class="role">{{ label }}</el-tag>
    </template>
  </QuickTable>
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

.role {
  margin: 0 3px;
}
</style>