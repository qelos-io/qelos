<script setup lang="ts">
import { ref, computed } from 'vue';
import { IntegrationSourceKind } from '@qelos/global-types';
import { useRoute } from 'vue-router';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { useIntegrationSources } from '@/modules/integrations/compositions/integration-sources';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { Ref } from 'vue';
import IntegrationSourceForm from './IntegrationSourceForm.vue';
import integrationSourcesService from '@/services/integration-sources-service';
import { useConfirmAction } from '../core/compositions/confirm-action';

const route = useRoute();
const kind = route.params.kind.toString() as IntegrationSourceKind;
const kindData = useIntegrationKinds()[kind];
const filteredConnections = computed(() => data.value || []);
const formVisible: Ref<boolean> = ref(false);
const editingIntegration = ref<any>(null);
const isEditing = ref(false);

const { result: data, loading, error } = useIntegrationSources(kind);

const { submit: saveConnection, submitting: saving } = useSubmitting(
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
      data.value = await integrationSourcesService.getAll({ kind });

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

const { submit: deleteConnectionBase, submitting: deleting } = useSubmitting(
  async (_id: string) => {
    try {

      await integrationSourcesService.remove(_id);
      data.value = await integrationSourcesService.getAll({ kind });
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

const openCreateForm = () => {
  editingIntegration.value = {
    name: '',
    labels: [],
    metadata: {
      scope: 'openid email profile',
    },
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

const closeForm = () => {
  formVisible.value = null;
};
</script>

<template>
  <h1>
    <img v-if="kindData?.logo" class="head-logo" :alt="kindData?.name" :src="kindData?.logo" />
    <span>{{ kindData?.name }} {{ $t('Connections') }}</span>
  </h1>

  <!-- Connections cards -->
  <div class="blocks-list">
    <BlockItem v-for="connection in filteredConnections" :key="connection.id" class="connection-card">
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
  <div v-if="!filteredConnections.length" class="empty-state">
    <p>{{ $t('No connections found. Create one to get started.') }}</p>
    <el-button type="primary" @click="openCreateForm">{{ $t('Create Connection') }}</el-button>
  </div>

  <!-- Modal -->
  <el-dialog v-model="formVisible" :title="editingIntegration?.id ? 'Edit Connection' : 'Create Connection'" width="50%"
    @close="closeForm">
    <IntegrationSourceForm v-model="editingIntegration" :kind="kind" @submit="saveConnection" @close="closeForm" />
  </el-dialog>
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

.blocks-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.connection-card {
  width: 28%;
}

.role {
  margin: 0 3px;
}

.empty-state {
  text-align: center;
  margin-top: 20px;
}
</style>
