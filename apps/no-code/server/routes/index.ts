import {app as getApp} from '@qelos/api-kit'
import blueprintsRouter from './blueprints';
import entitiesRouter from './entities';
import screensRouter from './screens';

export async function loadRoutes() {
  const app = getApp()
  app.use(screensRouter);
  app.use(entitiesRouter);
  app.use(blueprintsRouter);
}
