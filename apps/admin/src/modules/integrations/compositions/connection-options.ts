import { IIntegrationSource, IntegrationSourceKind, IHttpSource } from '@qelos/global-types';

type HttpOption = {
  label: string;
  value: string;
  name: string;
  icon?: string;
  faIcon?: string;
  data?: Partial<IHttpSource>;
}
type OptionalKind = IntegrationSourceKind.ClaudeAi |
  IntegrationSourceKind.Email |
  IntegrationSourceKind.Facebook |
  IntegrationSourceKind.Http |
  IntegrationSourceKind.LinkedIn |
  IntegrationSourceKind.OpenAI |
  IntegrationSourceKind.Qelos |
  IntegrationSourceKind.Google;
export function useConnectionOptions(kind: OptionalKind | string): HttpOption[] {

  const httpOptions: HttpOption[] = [
    {
      label: 'GitHub API',
      name: 'github',
      value: 'github',
      faIcon: 'fa-brands fa-github',
      data: {
        authentication: {
          securedHeaders: {
            Authorization: 'Bearer *****',
          },
        },
        metadata: {
          baseUrl: 'https://api.github.com',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
            Authorization: '*****',
          },
          method: 'GET',
          query: {},
        }
      }
    },
    {
      label: 'Stripe API',
      name: 'stripe',
      value: 'stripe',
      icon: 'icon-money',
      data: {
        metadata: {
          baseUrl: 'https://api.stripe.com/v1',
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'GET',
          query: {},
        }
      },
    },
    {
      label: 'Slack API',
      name: 'slack',
      value: 'slack',
      icon: 'icon-message',
      data: {
        authentication: {
          securedHeaders: {
            Authorization: 'Bearer *****',
          },
        },
        metadata: {
          baseUrl: 'https://slack.com/api',
          headers: {
            'Content-Type': 'application/json',
            Authorization: '*****',
          },
          method: 'GET',
          query: {},
        }
      },
    },
    {
      label: 'Twilio API',
      name: 'twilio',
      value: 'twilio',
      icon: 'icon-phone',
      data: {
        metadata: {
          baseUrl: 'https://api.twilio.com/2010-04-01',
          headers: {},
          method: 'GET',
          query: {},
        }
      },
    },
    {
      label: 'SendGrid API',
      name: 'sendgrid',
      value: 'sendgrid',
      icon: 'icon-message',
      data: {
        authentication: {
          securedHeaders: {
            Authorization: 'Bearer *****',
          },
        },
        metadata: {
          baseUrl: 'https://api.sendgrid.com/v3',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': '*****'
          },
          method: 'GET',
          query: {},
        }
      },
    },
  ]

  const options: Record<OptionalKind, HttpOption[]> = {
    [IntegrationSourceKind.Http]: httpOptions,
    [IntegrationSourceKind.OpenAI]: [],
    [IntegrationSourceKind.ClaudeAi]: [],
    [IntegrationSourceKind.Email]: [],
    [IntegrationSourceKind.Facebook]: [],
    [IntegrationSourceKind.LinkedIn]: [],
    [IntegrationSourceKind.Qelos]: [],
    [IntegrationSourceKind.Google]: [],
  }
  return options[kind];
}