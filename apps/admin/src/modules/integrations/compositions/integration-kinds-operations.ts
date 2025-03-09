import {
  HttpTargetOperation,
  IntegrationSourceKind,
  OpenAITargetOperation,
  QelosTargetOperation, QelosTriggerOperation
} from '@qelos/global-types';

export function useIntegrationKindsTargetOperations() {
  const operations: Record<IntegrationSourceKind, { label, name, details? }[] | undefined> = {
    [IntegrationSourceKind.Http]: [
      {
        label: 'Make HTTP Request', name: HttpTargetOperation.makeRequest, details: {
          method: 'POST',
          url: '/api/users',
          headers: {},
          query: {},
          body: {}
        }
      }
    ],
    [IntegrationSourceKind.Qelos]: [
      { label: 'Trigger Webhook Event', name: QelosTargetOperation.webhook },
      { name: QelosTargetOperation.createUser, label: 'Create User' },
      { name: QelosTargetOperation.updateUser, label: 'Update User' },
      { name: QelosTargetOperation.setUserRoles, label: 'Set User Roles' },
      { name: QelosTargetOperation.setWorkspaceLabels, label: 'Set Workspace Labels' },
      { name: QelosTargetOperation.createBlueprintEntity, label: 'Create Blueprint Entity' }
    ],
    [IntegrationSourceKind.N8n]: [],
    [IntegrationSourceKind.LinkedIn]: [],
    [IntegrationSourceKind.OpenAI]: [
      { name: OpenAITargetOperation.chatCompletion, label: 'Chat Completion' }
    ],
    [IntegrationSourceKind.Supabase]: [],
    [IntegrationSourceKind.Email]: [],
  }
  return operations
}


export function useIntegrationKindsTriggerOperations() {
  const operations: Record<IntegrationSourceKind, { label, name, details? }[] | undefined> = {
    [IntegrationSourceKind.Http]: [],
    [IntegrationSourceKind.Qelos]: [
      {
        name: QelosTriggerOperation.webhook,
        label: 'Subscribe to webhook event',
        details: { source: '*', kind: '*', eventName: '*' }
      },
    ],
    [IntegrationSourceKind.N8n]: [],
    [IntegrationSourceKind.LinkedIn]: [],
    [IntegrationSourceKind.OpenAI]: [],
    [IntegrationSourceKind.Supabase]: [],
    [IntegrationSourceKind.Email]: [],
  }
  return operations
}