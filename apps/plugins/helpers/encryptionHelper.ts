import { IntegrationSourceKind } from '@qelos/global-types';
import { storeEncryptedSourceAuthentication } from '../server/services/source-authentication-service';

export async function removeEncryptedSourceAuthentication(tenant: string, kind: IntegrationSourceKind, authentication: any) {
	if (!authentication || !authentication.clientSecret) {
		return;
	}
	
	try {
		await storeEncryptedSourceAuthentication(tenant, kind, null, authentication);
	} catch (err) {
		throw new Error("Failed to remove encrypted authentication");
	}
}