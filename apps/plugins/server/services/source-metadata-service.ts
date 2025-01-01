import { IntegrationSourceKind } from '../models/integration-source';

export async function validateSourceMetadata(kind: IntegrationSourceKind, metadata: any = {}) {
  if (kind === 'qelos') {
    const { external = false, url } = metadata;
    if (external) {
      if (!url) {
        return false;
      }
      try {
        new URL(url);
      } catch {
        return false;
      }
      return {
        external,
        url,
      }
    }
    return {
      external
    };
  }

  return {};
}
