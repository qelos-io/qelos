import { getCrud } from './crud'
import { IPlan } from '@qelos/global-types'

const plansService = getCrud<IPlan>('/api/plans')

export default plansService
