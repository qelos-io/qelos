import { getCrud } from './crud'
import { api, getCallData } from './api'
import {
  IIntegrationSource,
  IIntegrationSourceStatusRequest,
  IIntegrationSourceStatusResult,
} from '@qelos/global-types'

const integrationSourcesService = {
  ...getCrud<IIntegrationSource>('/api/integration-sources'),
  checkStatus(
    sourceId: string,
    body?: Partial<Pick<IIntegrationSource, 'metadata' | 'authentication'>>,
  ): Promise<IIntegrationSourceStatusResult> {
    return api.post(`/api/integration-sources/${sourceId}/status`, body ?? {}).then(getCallData)
  },
  checkDraftStatus(source: IIntegrationSourceStatusRequest): Promise<IIntegrationSourceStatusResult> {
    return api.post('/api/integration-sources/status', source).then(getCallData)
  },
}

export default integrationSourcesService
