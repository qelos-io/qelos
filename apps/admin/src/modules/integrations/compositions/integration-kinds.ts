import { IntegrationSourceKind } from '@qelos/global-types';

type OptionalKind = IntegrationSourceKind.ClaudeAi | 
  IntegrationSourceKind.Email |
  IntegrationSourceKind.Facebook |
  IntegrationSourceKind.Http |
  IntegrationSourceKind.LinkedIn |
  IntegrationSourceKind.OpenAI |
  IntegrationSourceKind.Qelos |
  IntegrationSourceKind.Google |
  IntegrationSourceKind.GitHub |
  IntegrationSourceKind.Gemini;

export function useIntegrationKinds(): Record<OptionalKind, { logo?, name, kind }> {
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
    [IntegrationSourceKind.ClaudeAi]: {
      logo: '/logos/claude.svg',
      name: 'Claude AI',
      kind: IntegrationSourceKind.ClaudeAi
    },
    // [IntegrationSourceKind.Supabase]: {
    //   logo: '/logos/supabase.png',
    //   name: 'Supabase',
    //   kind: IntegrationSourceKind.Supabase,
    // },
    // [IntegrationSourceKind.N8n]: {
    //   logo: '/logos/n8n.png',
    //   name: 'n8n',
    //   kind: IntegrationSourceKind.N8n,
    // },
    [IntegrationSourceKind.Email]: {
      name: 'EMAIL',
      kind: IntegrationSourceKind.Email
    },
    [IntegrationSourceKind.LinkedIn]: {
      logo: '/logos/linkedin.png',
      name: 'LinkedIn',
      kind: IntegrationSourceKind.LinkedIn
    },
    [IntegrationSourceKind.Facebook]: {
      logo: '/logos/facebook.png',
      name: 'Facebook',
      kind: IntegrationSourceKind.Facebook
    },
    [IntegrationSourceKind.Http]: {
      name: 'HTTP',
      kind: IntegrationSourceKind.Http
    },
    [IntegrationSourceKind.Google]: {
      logo: '/logos/google.svg',
      name: 'Google',
      kind: IntegrationSourceKind.Google
    },
    [IntegrationSourceKind.GitHub]: {
      logo: '/logos/github.svg',
      name: 'Github',
      kind: IntegrationSourceKind.GitHub
    },
    [IntegrationSourceKind.Gemini]: {
      logo: '/logos/gemini.png',
      name: 'Gemini',
      kind: IntegrationSourceKind.Gemini
    }
  }
}