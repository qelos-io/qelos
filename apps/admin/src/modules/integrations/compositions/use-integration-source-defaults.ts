import { IntegrationSourceKind } from '@qelos/global-types';

export function useIntegrationSourceDefaults() {
  const getDefaultMetadata = (kind: IntegrationSourceKind) => {
    if (kind === IntegrationSourceKind.LinkedIn) {
      return { scope: 'openid email profile' };
    }
    if (kind === IntegrationSourceKind.Facebook) {
      return { scope: 'openid email public_profile' };
    }
    if (kind === IntegrationSourceKind.Google || kind === IntegrationSourceKind.GitHub) {
      return { scope: 'openid email public_profile' };
    }

    return {};
  };

  const buildBlankIntegrationSource = (kind: IntegrationSourceKind) => ({
    kind,
    name: '',
    labels: [],
    metadata: getDefaultMetadata(kind),
    authentication: {}
  });

  return {
    getDefaultMetadata,
    buildBlankIntegrationSource
  };
}
