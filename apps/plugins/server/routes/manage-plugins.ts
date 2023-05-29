import {getRouter, verifyUser, populateUser, getBodyParser} from '@qelos/api-kit';
import {
  createPlugin,
  getAllPlugins,
  getPlugin,
  redirectToPluginMfe,
  removePlugin,
  updatePlugin
} from '../controllers/manage-plugins';
import {checkEditPrivileged, onlyEditPrivileged, onlyViewPrivileged} from '../middlewares/privileged-check';

export function managePlugins() {
  const router = getRouter();

  const AUTHENTICATION_MIDDLEWARES = [getBodyParser(), populateUser, verifyUser];

  router
    .get('/api/plugins', populateUser, checkEditPrivileged, getAllPlugins)
    .post('/api/plugins', AUTHENTICATION_MIDDLEWARES.concat(onlyEditPrivileged, createPlugin))

  router
    .get('/api/plugins/:pluginId', AUTHENTICATION_MIDDLEWARES.concat(onlyViewPrivileged, getPlugin))
    .get('/api/plugins/:pluginId/callback', populateUser, redirectToPluginMfe)
    .put('/api/plugins/:pluginId', AUTHENTICATION_MIDDLEWARES.concat(onlyEditPrivileged, updatePlugin))
    .delete('/api/plugins/:pluginId', AUTHENTICATION_MIDDLEWARES.concat(onlyEditPrivileged, removePlugin))

  return router;
}
