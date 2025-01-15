import { getCrud } from './crud';
import { IIntegration } from '@qelos/global-types';

const integrationsService = getCrud<IIntegration>('/api/integrations')

export default integrationsService
