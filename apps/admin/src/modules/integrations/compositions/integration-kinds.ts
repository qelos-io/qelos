import { IntegrationSourceKind } from '@qelos/global-types';

export function useIntegrationKinds(): Record<IntegrationSourceKind, { logo?, name, kind }> {
  return {
    [IntegrationSourceKind.Qelos]: {
      logo: '/logos/qelos_small.jpg',
      name: 'Qelos',
      kind: IntegrationSourceKind.Qelos,
    },
    [IntegrationSourceKind.OpenAI]: {
      logo: '/logos/openai.svg',
      name: 'Open AI',
      kind: IntegrationSourceKind.OpenAI
    },
    [IntegrationSourceKind.Supabase]: {
      logo: '/logos/supabase.png',
      name: 'Supabase',
      kind: IntegrationSourceKind.Supabase,
    },
    [IntegrationSourceKind.N8n]: {
      logo: '/logos/n8n.png',
      name: 'n8n',
      kind: IntegrationSourceKind.N8n,
    },
    [IntegrationSourceKind.SMTP]: {
      name: 'SMTP',
      kind: IntegrationSourceKind.SMTP
    }
  }
}