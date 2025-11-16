import { IMetaCrud } from '@/modules/plugins/store/types';
import { getCrud } from '@/services/apis/crud';
import blocksService from '@/services/apis/blocks-service';
import blueprintsService from '@/services/apis/blueprints-service';
import configurationsService from '@/services/apis/configurations-service';
import invitesService from '@/services/apis/invites-service';
import pluginsService from '@/services/apis/plugins-service';
import storagesService from '@/services/apis/storages-service';
import usersService from '@/services/apis/users-service';
import workspacesService from '@/services/apis/workspaces-service';
import integrationSourcesService from '@/services/apis/integration-sources-service';
import eventsService from '@/services/apis/events-service';
import threadsService from '@/services/apis/threads-service';

function getMetaCrud(api: ReturnType<typeof getCrud>, editRouteName?: string, paramIdentifierName?: string): IMetaCrud {
  return {
    api,
    navigateAfterSubmit: editRouteName ? {
      name: editRouteName,
      params: paramIdentifierName ? { [paramIdentifierName]: '{IDENTIFIER}' } : {},
      query: {}
    } : undefined,
    identifierKey: '_id',
    clearAfterSubmit: true,
  }
}

export function getAllStandardMetaCruds(): Record<string, IMetaCrud> {
  return {
    blocks: getMetaCrud(blocksService, 'editBlock', 'blockId'),
    blueprints: getMetaCrud(blueprintsService, 'editBlueprint', 'blueprintIdentifier'),
    configurations: getMetaCrud(configurationsService, 'editConfiguration', 'key'),
    invites: getMetaCrud(invitesService),
    plugins: getMetaCrud(pluginsService, 'editPlugin', 'pluginId'),
    storages: getMetaCrud(storagesService, 'editStorage', 'storageId'),
    users: getMetaCrud(usersService, 'editUser', 'userId'),
    workspaces: getMetaCrud(workspacesService, 'workspaces'),
    integrationSources: getMetaCrud(integrationSourcesService, 'editIntegrationSource', 'sourceId'),
    events: getMetaCrud(eventsService, null, 'eventId'),
    threads: getMetaCrud(threadsService, null, 'threadId')
  }
}