import { ResponseError } from '@qelos/api-kit';
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

  if (kind === IntegrationSourceKind.OpenAI || kind === IntegrationSourceKind.Gemini) {
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
      throw new ResponseError('Invalid LinkedIn metadata: clientId and scope are required.', 400);
    }
    return { clientId, scope };
  }

  if (kind === IntegrationSourceKind.Facebook) {
    const { clientId, scope } = metadata;
    if (!clientId || typeof clientId !== 'string' || !scope || typeof scope !== 'string') {
      throw new ResponseError('Invalid Facebook metadata: clientId and scope are required.', 400);
    }
    return { clientId, scope };
  }

  if (kind === IntegrationSourceKind.Google) {
    const { clientId, scope } = metadata;
    if (!clientId || typeof clientId !== 'string' || !scope || typeof scope !== 'string') {
      throw new ResponseError('Invalid Google metadata: clientId and scope are required.', 400);
    }
    return { clientId, scope };
  }

  if (kind === IntegrationSourceKind.GitHub) {
    const { clientId, scope } = metadata;
    if (!clientId || typeof clientId !== 'string' || !scope || typeof scope !== 'string') {
      throw new ResponseError('Invalid Github metadata: clientId and scope are required.', 400);
    }
    return { clientId, scope };
  }

  if (kind === IntegrationSourceKind.N8n) {
    const { url } = metadata;
    if (typeof url !== 'string') {
      throw new ResponseError('Invalid N8n metadata: url is required.', 400);
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
      throw new ResponseError('Invalid Http metadata: baseUrl is required and must be a valid URL.', 400)
    }
    if (!(typeof method === 'undefined' || typeof method === 'string')) {
      throw new ResponseError('Invalid Http metadata: method must be a string.', 400)
    }
    if (typeof headers !== 'object' || headers === null) {
      throw new ResponseError('Invalid Http metadata: headers is required.', 400);
    }
    if (headers && Object.values(headers).find(v => typeof v !== 'string')) {
      throw new ResponseError('Invalid Http metadata: headers must be an object of strings.', 400);
    }
    if (query && Object.values(query).find(v => typeof v !== 'string')) {
      throw new ResponseError('Invalid Http metadata: headers must be an object of strings.', 400);
    }
    return {
      method: method || 'GET',
      baseUrl,
      headers,
      query: query || {}
    }
  }

  if (kind === IntegrationSourceKind.Email) {
    const { email, pop3, senderName, smtp, username } = metadata;
    if (!email || typeof email !== 'string' || !pop3 || typeof pop3 !== 'string' || !senderName || typeof senderName !== 'string' || !smtp || typeof smtp !== 'string' || !username || typeof username !== 'string') {
      throw new ResponseError('Invalid Email metadata: email, pop3, senderName, smtp, and username are required.', 400)
    }
    return {
      email,
      pop3,
      senderName,
      smtp,
      username
    }
  }

  return {};
}
