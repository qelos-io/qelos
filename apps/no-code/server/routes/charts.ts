import { getRouter, verifyUser, populateUser } from '@qelos/api-kit';
import { checkAllPrivileges } from '../middlewares/privileged-check';
import { getBlueprintByIdentifierMiddleware } from '../middlewares/blueprints';
import { checkChartPermissions, getPieChart, getStandardChart, getCountCard, getSumCard } from '../controllers/charts';
const chartsRouter = getRouter();

const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser, checkAllPrivileges, getBlueprintByIdentifierMiddleware, checkChartPermissions]

chartsRouter
  .get('/api/blueprints/:blueprintIdentifier/charts/pie', AUTHENTICATION_MIDDLEWARES.concat(getPieChart) as any[])
  .get('/api/blueprints/:blueprintIdentifier/charts/count', AUTHENTICATION_MIDDLEWARES.concat(getCountCard) as any[])
  .get('/api/blueprints/:blueprintIdentifier/charts/sum', AUTHENTICATION_MIDDLEWARES.concat(getSumCard) as any[])
  .get('/api/blueprints/:blueprintIdentifier/charts/:chartType', AUTHENTICATION_MIDDLEWARES.concat(getStandardChart) as any[])

export default chartsRouter;
