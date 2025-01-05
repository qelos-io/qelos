import { IntegrationSourceKind } from "@qelos/global-types";

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

  return {};
}
