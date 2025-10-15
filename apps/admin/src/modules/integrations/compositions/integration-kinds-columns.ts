import { IntegrationSourceKind } from '@qelos/global-types';

export function useIntegrationKindsColumns(): Record<IntegrationSourceKind, Array<{ prop, label }>> {
  return {
    [IntegrationSourceKind.Qelos]: [
      { prop: 'metadata.url', label: 'URL' },
      { prop: 'metadata.username', label: 'Username' }
    ],
    [IntegrationSourceKind.OpenAI]: [],
    [IntegrationSourceKind.Supabase]: [],
    [IntegrationSourceKind.N8n]: [],
    [IntegrationSourceKind.Email]: [],
    [IntegrationSourceKind.LinkedIn]: [],
    [IntegrationSourceKind.Facebook]: [], 
    [IntegrationSourceKind.ClaudeAi]: [],
    [IntegrationSourceKind.Http]: [],
    [IntegrationSourceKind.Google]: [],
  }
}