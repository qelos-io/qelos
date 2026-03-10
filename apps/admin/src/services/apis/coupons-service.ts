import { getCrud } from './crud'
import { api, getCallData } from './api'
import { ICoupon } from '@qelos/global-types'

const couponsService = {
  ...getCrud<ICoupon>('/api/coupons'),
  validate(code: string, planId?: string): Promise<ICoupon> {
    return api.post('/api/coupons/validate', { code, planId }).then(getCallData)
  },
}

export default couponsService
