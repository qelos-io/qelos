import { getCrud } from './crud'
import { INoCodeComponent } from '@qelos/global-types';

const componentsService = getCrud<INoCodeComponent>('/api/components')

export default componentsService
