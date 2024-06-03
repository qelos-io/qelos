import { getCrud } from './crud'
import { IBlueprint } from '@qelos/global-types';

const blueprintsService = getCrud<IBlueprint>('/api/blueprints')

export default blueprintsService
