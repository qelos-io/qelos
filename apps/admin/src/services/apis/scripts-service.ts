import { getCrud } from './crud'
import type { IScript } from '@qelos/sdk/src/administrator/scripts'

// `/api/scripts` serves scripts and components; the admin only asks it for scripts (`?type=script`)
const crud = getCrud<IScript>('/api/scripts')

const scriptsService = {
  ...crud,
  getAll: () => crud.getAll({ type: 'script' }),
}

export default scriptsService
