<script setup lang="ts">
import { ref, computed } from 'vue';
import { IntegrationSourceKind } from '@qelos/global-types';
import { useRoute } from 'vue-router';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import integrationSourcesService from '@/services/apis/integration-sources-service';
import { useConfirmAction } from '../core/compositions/confirm-action';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import IntegrationSourceFormModal from '@/modules/integrations/components/IntegrationSourceFormModal.vue';
import EmptyState from '@/modules/core/components/layout/EmptyState.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useSecuredHeadersMasked } from './compositions/use-secured-headers-masked';
import { useConnectionOptions } from './compositions/connection-options';

const { securedHeadersMasked } = useSecuredHeadersMasked();
const route = useRoute();
const kind = route.params.kind.toString() as IntegrationSourceKind;
const kindData = useIntegrationKinds()[kind];
const store = useIntegrationSourcesStore();
const data = computed(() => store.groupedSources[kind]);

const suggestedOptions = useConnectionOptions(kind);

const filteredConnections = computed(() => data.value || []);
const formVisible = ref(false);
const editingIntegration = ref<any>(null);
const isEditing = ref(false);


const { submit: saveConnection } = useSubmitting(
  async (formData: any) => {
    try {

      let savedData;
      if (editingIntegration.value?._id) {
        isEditing.value = true;
        // Update an existing connection
        savedData = await integrationSourcesService.update(editingIntegration.value._id, formData);
      } else {
        isEditing.value = false;
        // Create a new connection in the database
        savedData = await integrationSourcesService.create(formData);
      }
      // Update the connection list after saving
      await store.retry();

      return savedData;
    } catch (error) {
      throw error;
    }
  },
  {
    success: () => (isEditing.value ? 'Connection updated successfully' : 'Connection created successfully'),
    error: 'Failed to save connection',
  },
  () => (formVisible.value = false)
);

const { submit: deleteConnectionBase } = useSubmitting(
  async (_id: string) => {
    try {

      await integrationSourcesService.remove(_id);
      await store.retry();
      // removing securitedHeader from HTTP form 
      if (Object.keys(securedHeadersMasked.value).length > 0) {
        securedHeadersMasked.value = {};
      }

      return _id;
    } catch (error) {
      throw error;
    }
  },
  {
    success: 'Connection deleted successfully',
    error: 'Failed to delete connection',
  }
);

const deleteConnection = useConfirmAction(deleteConnectionBase, {
  text: 'Are you sure you want to delete this connection?',
  title: 'Confirm Delete',
  type: 'warning'
});

function getDefaultMetadata(kind: IntegrationSourceKind) {
  if (kind === 'linkedin') {
    return {
      scope: 'openid email profile',
    };
  }
  if (kind === 'facebook') {
    return {
      scope: 'openid email public_profile',
    };
  }
  if (kind === 'google') {
    return {
      scope: 'openid email profile',
    };
  }
  if (kind === 'github') {
    return {
      scope: 'openid email profile',
    };
  }
  return {};
}

const openCreateForm = () => {
  editingIntegration.value = {
    kind,
    name: '',
    labels: [],
    metadata: getDefaultMetadata(kind),
    authentication: {},
  };
  formVisible.value = true;
};

const openEditForm = (connection) => {
  if (!connection) {
    return;
  }

  editingIntegration.value = {
    ...connection,
    authentication: connection.authentication || {},
  };

  formVisible.value = true;
};

const createOptionalConnection = (value: string) => {
  const option = suggestedOptions.find((option) => option.value === value);
  if (!option) {
    return;
  }
  openEditForm({
    ...option.data,
    authentication: {
      ...option.data.authentication,
    },
    name: option.label,
    kind,
    labels: [],
    metadata: {
      ...getDefaultMetadata(kind),
      ...option.data.metadata,
    },
  });
};

const closeForm = () => {
  formVisible.value = null;
};
</script>

<template>
  <ListPageTitle @create="openCreateForm" :options="suggestedOptions" @selected="createOptionalConnection($event)">
    <img v-if="kindData?.logo" class="head-logo" :alt="kindData?.name" :src="kindData?.logo" />
    <span>{{ kindData?.name }} {{ $t('Connections') }}</span>
  </ListPageTitle>

  <!-- Connections cards -->
  <div class="blocks-list">
    <BlockItem v-for="connection in filteredConnections" :key="connection._id" class="connection-card">
      <template #header>
        <h3>{{ connection.name }}</h3>
      </template>
      <p>
        <strong>{{ $t('Labels') }}:</strong>
        <el-tag v-for="label in connection.labels" :key="label" class="role">{{ label }}</el-tag>
      </p>
      <p v-if="connection.metadata.url">
        <strong>{{ $t('URL') }}:</strong> {{ connection.metadata.url }}
      </p>
      <p v-if="connection.metadata.clientId">
        <strong>{{ $t('Client ID') }}:</strong> {{ connection.metadata.clientId }}
      </p>
      <p v-if="connection.metadata.baseUrl" class="base-url-container">
        <strong class="base-url-text">{{ $t('Base Url') }}:</strong>
        <span class="base-url">{{ connection.metadata.baseUrl }}</span>
      </p>
      <p v-if="connection.metadata.scope">
        <strong>{{ $t('Scope') }}:</strong> {{ connection.metadata.scope }}
      </p>
      <p v-if="connection.metadata.apiEndpoint">
        <strong>{{ $t('API Endpoint') }}:</strong> {{ connection.metadata.apiEndpoint }}
      </p>
      <template #actions>
        <el-button size="small" type="primary" @click="openEditForm(connection)">{{ $t('Edit') }}</el-button>
        <RemoveButton wide @click="deleteConnection(connection._id)" />
      </template>
    </BlockItem>
  </div>

  <!-- If there are no connections -->
  <EmptyState v-if="store.loaded && !filteredConnections.length"
    description="No connections found. Create one to get started.">
    <el-button type="primary" @click="openCreateForm">{{ $t('Create Connection') }}</el-button>
  </EmptyState>

  <IntegrationSourceFormModal v-model:visible="formVisible" v-model:editing-integration="editingIntegration"
    :kind="kind" @save="saveConnection" @close="closeForm" />
</template>

<style scoped>
.base-url-container {
  display: flex;
  align-items: center;
  gap: 3px;
  width: 100%;
}

.base-url-text {
  flex-shrink: 0;
}

.base-url {
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

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

.blocks-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.connection-card {
  width: 28%;
  min-width: 250px;
}

.role {
  margin: 0 3px;
}
</style>
