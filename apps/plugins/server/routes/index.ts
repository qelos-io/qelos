import { app as getApp } from '@qelos/api-kit'
import { managePlugins } from './manage-plugins';
import { playPlugins } from './play-plugins';
import eventsRouter from './events';
import { integrationsRouter } from './integrations';
import { integrationSourcesRouter } from './integration-sources';

export async function loadRoutes() {
  const app = getApp()
  app.use(managePlugins());
  app.use(playPlugins());
  app.use(eventsRouter);
  app.use(integrationSourcesRouter());
  app.use(integrationsRouter());
}
