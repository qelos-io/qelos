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

  return {};
}
