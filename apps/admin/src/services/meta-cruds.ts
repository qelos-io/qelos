import { IMetaCrud } from '@/modules/plugins/store/types';
import { getCrud } from '@/services/crud';
import blocksService from '@/services/blocks-service';
import blueprintsService from '@/services/blueprints-service';
import configurationsService from '@/services/configurations-service';
import invitesService from '@/services/invites-service';
import pluginsService from '@/services/plugins-service';
import storagesService from '@/services/storages-service';
import usersService from '@/services/users-service';
import workspacesService from '@/services/workspaces-service';

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
  }
}