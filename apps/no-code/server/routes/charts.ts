import { getRouter, verifyUser, populateUser } from '@qelos/api-kit';
import { checkAllPrivileges } from '../middlewares/privileged-check';
import { getBlueprintByIdentifierMiddleware } from '../middlewares/blueprints';
import { checkChartPermissions, getPieChart, getStandardChart } from '../controllers/charts';
const chartsRouter = getRouter();

const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser, checkAllPrivileges, getBlueprintByIdentifierMiddleware, checkChartPermissions]

chartsRouter
  .get('/api/blueprints/:blueprintIdentifier/charts/pie', AUTHENTICATION_MIDDLEWARES.concat(getPieChart))
  .get('/api/blueprints/:blueprintIdentifier/charts/:chartType', AUTHENTICATION_MIDDLEWARES.concat(getStandardChart))

export default chartsRouter;
