import { IntegrationSourceKind } from '@qelos/global-types';

export async function validateSourceMetadata(kind: IntegrationSourceKind, metadata: any = {}) {
  if (kind === IntegrationSourceKind.Qelos) {
    const { external = false, url, username } = metadata;
    if (external) {
      if (!(url && username)) {
        return false;
      }
      try {
        new URL(url);
      } catch {
        return false;
      }
      return {
        external,
        username,
        url,
      }
    }
    return {
      external
    };
  }

  if (kind === IntegrationSourceKind.OpenAI) {
    const { defaultModel, initialMessages } = metadata;
    return {
      defaultModel: typeof defaultModel === 'string' ? defaultModel : null,
      initialMessages: initialMessages instanceof Array ? initialMessages.map(msg => {
        return {
          role: typeof msg.role === 'string' ? msg.role : 'system',
          content: typeof msg.content === 'string' ? msg.content : '',
        }
      }).filter(msg => !!msg.content) : [],
    };
  }

  if (kind === IntegrationSourceKind.ClaudeAi) {
    const { defaultModel, initialMessages } = metadata;
    return {
      defaultModel: typeof defaultModel === 'string' ? defaultModel : null,
      initialMessages: initialMessages instanceof Array ? initialMessages.map(msg => {
        return {
          role: typeof msg.role === 'string' ? msg.role : 'system',
          content: typeof msg.content === 'string' ? msg.content : '',
        }
      }).filter(msg => !!msg.content) : [],
    };
  }

  if (kind === IntegrationSourceKind.LinkedIn) {
    const { clientId, scope } = metadata;
    if (!clientId || typeof clientId !== 'string' || !scope || typeof scope !== 'string') {
      throw new Error('Invalid LinkedIn metadata: clientId and scope are required.');
    }
    return { clientId, scope };
  }

  if (kind === IntegrationSourceKind.N8n) {
    const { url } = metadata;
    if (typeof url !== 'string') {
      throw new Error('Invalid N8n metadata: url is required.');
    }
    return {
      url
    }
  }

  if (kind === IntegrationSourceKind.Http) {
    const { baseUrl, headers, query, method } = metadata;
    try {
      new URL(baseUrl);
    } catch {
      throw new Error('Invalid Http metadata: baseUrl is required and must be a valid URL.')
    }
    if (!(typeof method === 'undefined' || typeof method === 'string')) {
      throw new Error('Invalid Http metadata: method must be a string.')
    }
    if (typeof headers !== 'object' || headers === null) {
      throw new Error('Invalid Http metadata: headers is required.');
    }
    if (headers && Object.values(headers).find(v => typeof v !== 'string')) {
      throw new Error('Invalid Http metadata: headers must be an object of strings.');
    }
    if (query && Object.values(query).find(v => typeof v !== 'string')) {
      throw new Error('Invalid Http metadata: headers must be an object of strings.');
    }
    return {
      method: method || 'GET',
      baseUrl,
      headers,
      query: query || {}
    }
  }

  return {};
}
