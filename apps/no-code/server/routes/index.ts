import { app as getApp, config } from '@qelos/api-kit'
import blueprintsRouter from './blueprints';
import entitiesRouter from './entities';
import chartsRouter from './charts';
import componentsRouter from './components';

config({
  bodyParserOptions: {
    limit: '50mb'
  }
})

const app = getApp()
app.use(entitiesRouter);
app.use(chartsRouter);
app.use(blueprintsRouter);
app.use(componentsRouter);