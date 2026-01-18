import {
  HttpTargetOperation,
  IntegrationSourceKind,
  OpenAITargetOperation,
  QelosTargetOperation, QelosTriggerOperation, ClaudeAITargetOperation,
  EmailTargetOperation,
  OpenAITriggerOperation
} from '@qelos/global-types';

export function useIntegrationKindsTargetOperations() {
  const operations: Record<IntegrationSourceKind, { label, name, details? }[] | undefined> = {
    [IntegrationSourceKind.Facebook]: [
      // { label: 'Get User Profile', name: 'getUserProfile', details: 'Get user profile information' },
      // { label: 'Get Posts', name: 'getPosts', details: 'Get user posts' },
      // { label: 'Post Message', name: 'postMessage', details: 'Post a message to user wall' },
    ],
    [IntegrationSourceKind.Http]: [
      {
        label: 'Make HTTP Request', 
        name: HttpTargetOperation.makeRequest, 
        details: {
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
    [IntegrationSourceKind.Google]: [], 
    [IntegrationSourceKind.GitHub]: [], 
    [IntegrationSourceKind.OpenAI]: [
      { name: OpenAITargetOperation.chatCompletion, label: 'Chat Completion' },
      { name: OpenAITargetOperation.uploadContentToStorage, label: 'Upload Content to Storage' },
      { name: OpenAITargetOperation.clearStorageFiles, label: 'Clear Storage Files' }
    ],
    [IntegrationSourceKind.ClaudeAi]: [
      { name: ClaudeAITargetOperation.chatCompletion, label: 'Chat Completion' }
    ],
    [IntegrationSourceKind.Supabase]: [],
    [IntegrationSourceKind.Email]: [
      { name: EmailTargetOperation.sendEmail, label: 'Send Email' }
    ],
  }
  return operations
}

export interface TriggerOperation {
  label: string;
  name: string;
  details?: any;
  options?: TriggerOption[];
}

export interface TriggerOption {
  label: string;
  value: any;
}

export function useIntegrationKindsTriggerOperations() {
  const operations: Record<IntegrationSourceKind, TriggerOperation[] | undefined> = {
    [IntegrationSourceKind.Http]: [],
    [IntegrationSourceKind.Qelos]: [
      {
        name: QelosTriggerOperation.webhook,
        label: 'Subscribe to webhook event',
        options: [
          {
            label: 'User Registered',
            value: {
              source: 'auth',
              kind: 'signup',
              eventName: 'user-registered',
            }
          },
          {
            label: 'Workspace Created',
            value: {
              source: 'auth',
              kind: 'workspaces',
              eventName: 'workspace-created',
            }
          },
          {
            label: 'Blueprint Entity Created',
            value: {
              source: 'blueprints',
              kind: 'YOUR_BLUEPRINT_NAME',
              eventName: 'create',
            }
          }
        ],
        details: { source: '*', kind: '*', eventName: '*' }
      },
      {
        name: QelosTriggerOperation.chatCompletion,
        label: 'Chat Completion',
        details: {}
      },
    ],
    [IntegrationSourceKind.N8n]: [],
    [IntegrationSourceKind.LinkedIn]: [],
    [IntegrationSourceKind.Facebook]: [],
    [IntegrationSourceKind.Google]: [], 
    [IntegrationSourceKind.GitHub]: [], 
    [IntegrationSourceKind.OpenAI]: [
      {
        name: OpenAITriggerOperation.functionCalling,
        label: 'Function Calling',
        details: {
          allowedIntegrationIds: ['*'],
          blockedIntegrationIds: []
        }
      }
    ],
    [IntegrationSourceKind.ClaudeAi]: [],
    [IntegrationSourceKind.Supabase]: [],
    [IntegrationSourceKind.Email]: [],
  }
  return operations
}