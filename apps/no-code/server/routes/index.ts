import { app as getApp } from '@qelos/api-kit'
import blueprintsRouter from './blueprints';
import entitiesRouter from './entities';
import screensRouter from './screens';
import chartsRouter from './charts';

const app = getApp()
app.use(screensRouter);
app.use(entitiesRouter);
app.use(chartsRouter);
app.use(blueprintsRouter);