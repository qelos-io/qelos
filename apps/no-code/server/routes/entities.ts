import { getRouter, verifyUser, populateUser } from '@qelos/api-kit';
import { checkAllPrivileges, onlyEditPrivileged } from '../middlewares/privileged-check';
import { getBlueprintByIdentifierMiddleware } from '../middlewares/blueprints';
import {
  createBlueprintEntity,
  getAllBlueprintEntities,
  getSingleBlueprintEntity,
  removeBlueprintEntity,
  removeAllBlueprintEntities,
  updateBlueprintEntity
} from '../controllers/entities';

const entitiesRouter = getRouter();

const AUTHENTICATION_MIDDLEWARES = [populateUser, checkAllPrivileges, getBlueprintByIdentifierMiddleware]
const AUTHENTICATION_MIDDLEWARES_FOR_ADMIN = [populateUser, verifyUser, onlyEditPrivileged]

entitiesRouter
  .get('/api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', AUTHENTICATION_MIDDLEWARES.concat(getSingleBlueprintEntity))
  .get('/api/blueprints/:blueprintIdentifier/entities', AUTHENTICATION_MIDDLEWARES.concat(getAllBlueprintEntities))
  .post('/api/blueprints/:blueprintIdentifier/entities', AUTHENTICATION_MIDDLEWARES.concat(createBlueprintEntity))
  .put('/api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', AUTHENTICATION_MIDDLEWARES.concat(updateBlueprintEntity))
  .delete('/api/blueprints/:blueprintIdentifier/entities/all', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN.concat(removeAllBlueprintEntities))
  .delete('/api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', AUTHENTICATION_MIDDLEWARES.concat(removeBlueprintEntity))

entitiesRouter
  .get('/internal-api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', (req, res, next) => {
    req.user = { roles: ['admin'] }
    next();
  }, getSingleBlueprintEntity)


  entitiesRouter
  .get('/internal-api/blueprints/:blueprintIdentifier/entities', (req, res, next) => {
    req.user = { roles: ['admin'] }
    next();
  }, getAllBlueprintEntities)

export default entitiesRouter;
