import { getCrud } from './crud'

const blueprintsService = getCrud<any>('/api/blueprints')

export default blueprintsService
