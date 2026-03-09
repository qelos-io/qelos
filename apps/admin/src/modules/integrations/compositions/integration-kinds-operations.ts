import {
  HttpTargetOperation,
  IntegrationSourceKind,
  OpenAITargetOperation,
  QelosTargetOperation, QelosTriggerOperation, ClaudeAITargetOperation,
  EmailTargetOperation,
  OpenAITriggerOperation,
  PayPalTargetOperation,
  PaddleTargetOperation
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
    [IntegrationSourceKind.AWS]: [],
    [IntegrationSourceKind.Cloudflare]: [],
    [IntegrationSourceKind.Sumit]: [],
    [IntegrationSourceKind.Gemini]: [],
    [IntegrationSourceKind.PayPal]: [
      { name: PayPalTargetOperation.createOrder, label: 'Create Order' },
      { name: PayPalTargetOperation.captureOrder, label: 'Capture Order' },
      { name: PayPalTargetOperation.refundPayment, label: 'Refund Payment' },
      { name: PayPalTargetOperation.createProduct, label: 'Create Product' },
      { name: PayPalTargetOperation.createSubscription, label: 'Create Subscription' },
      { name: PayPalTargetOperation.listTransactions, label: 'List Transactions' },
    ],
    [IntegrationSourceKind.Paddle]: [
      { name: PaddleTargetOperation.createProduct, label: 'Create Product' },
      { name: PaddleTargetOperation.listProducts, label: 'List Products' },
      { name: PaddleTargetOperation.createPrice, label: 'Create Price' },
      { name: PaddleTargetOperation.listPrices, label: 'List Prices' },
      { name: PaddleTargetOperation.createSubscription, label: 'Create Subscription' },
      { name: PaddleTargetOperation.getSubscription, label: 'Get Subscription' },
      { name: PaddleTargetOperation.listSubscriptions, label: 'List Subscriptions' },
      { name: PaddleTargetOperation.cancelSubscription, label: 'Cancel Subscription' },
      { name: PaddleTargetOperation.listTransactions, label: 'List Transactions' },
      { name: PaddleTargetOperation.getTransaction, label: 'Get Transaction' },
      { name: PaddleTargetOperation.createCustomer, label: 'Create Customer' },
      { name: PaddleTargetOperation.listCustomers, label: 'List Customers' },
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
      {
        name: QelosTriggerOperation.apiWebhook,
        label: 'API Webhook',
        details: {}
      }
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
    [IntegrationSourceKind.AWS]: [],
    [IntegrationSourceKind.Cloudflare]: [],
    [IntegrationSourceKind.Sumit]: [],
    [IntegrationSourceKind.Gemini]: [],
    [IntegrationSourceKind.PayPal]: [],
    [IntegrationSourceKind.Paddle]: [],
  }
  return operations
}