import {
  HttpTargetOperation,
  IntegrationSourceKind,
  OpenAITargetOperation,
  QelosTargetOperation, QelosTriggerOperation, ClaudeAITargetOperation
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
    [IntegrationSourceKind.ClaudeAi]: [
      { name: ClaudeAITargetOperation.chatCompletion, label: 'Chat Completion' }
    ],
    [IntegrationSourceKind.Supabase]: [],
    [IntegrationSourceKind.Email]: [],
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
    ],
    [IntegrationSourceKind.N8n]: [],
    [IntegrationSourceKind.LinkedIn]: [],
    [IntegrationSourceKind.OpenAI]: [
      {
        name: 'chatCompletion',
        label: 'Chat Completion',
        details: {
          max_tokens: 1000,
          model: 'gpt-4',
          pre_messages: [],
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        },
        options: [
          {
            label: 'Vacations Manager',
            value: {
              max_tokens: 1000,
              model: 'gpt-4',
              pre_messages: [
                { role: 'system', content: 'You are a helpful vacation planning assistant. Help users plan their perfect vacation by suggesting destinations, activities, and accommodations based on their preferences and budget.' }
              ],
              temperature: 0.7,
              top_p: 1,
              frequency_penalty: 0,
              presence_penalty: 0
            }
          },
          {
            label: 'Private Chef',
            value: {
              max_tokens: 1000,
              model: 'gpt-4',
              pre_messages: [
                { role: 'system', content: 'You are a professional chef assistant. Provide recipe suggestions, cooking tips, and meal planning advice based on users\'s dietary preferences, available ingredients, and cooking skill level.' }
              ],
              temperature: 0.7,
              top_p: 1,
              frequency_penalty: 0,
              presence_penalty: 0
            }
          },
          {
            label: 'Champion Sales Manager',
            value: {
              max_tokens: 1000,
              model: 'gpt-4',
              pre_messages: [
                { role: 'system', content: 'You are an expert sales coach. Help users improve their sales techniques, overcome objections, and close deals more effectively. Provide strategic advice tailored to their industry and target market.' }
              ],
              temperature: 0.8,
              top_p: 1,
              frequency_penalty: 0,
              presence_penalty: 0
            }
          }
        ]
      },
    ],
    [IntegrationSourceKind.ClaudeAi]: [],
    [IntegrationSourceKind.Supabase]: [],
    [IntegrationSourceKind.Email]: [],
  }
  return operations
}