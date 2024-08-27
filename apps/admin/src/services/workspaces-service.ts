import { getCrud } from './crud'
import { IWorkspace } from '@qelos/sdk/dist/workspaces';

const workspacesService = getCrud<IWorkspace>('/api/workspaces')

export default workspacesService
