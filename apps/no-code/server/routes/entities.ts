import { getRouter, verifyUser, populateUser } from '@qelos/api-kit';
import { checkAllPrivileges, onlyEditPrivileged } from '../middlewares/privileged-check';
import { getBlueprintByIdentifierMiddleware } from '../middlewares/blueprints';
import {
  createBlueprintEntity,
  getAllBlueprintEntities,
  getSingleBlueprintEntity, removeBlueprintEntity,
  updateBlueprintEntity
} from '../controllers/entities';

const entitiesRouter = getRouter();

const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser, checkAllPrivileges, getBlueprintByIdentifierMiddleware]

entitiesRouter
  .get('/api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', AUTHENTICATION_MIDDLEWARES.concat(getSingleBlueprintEntity))
  .get('/api/blueprints/:blueprintIdentifier/entities', AUTHENTICATION_MIDDLEWARES.concat(getAllBlueprintEntities))
  .post('/api/blueprints/:blueprintIdentifier/entities', AUTHENTICATION_MIDDLEWARES.concat(createBlueprintEntity))
  .put('/api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', AUTHENTICATION_MIDDLEWARES.concat(updateBlueprintEntity))
  .delete('/api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', AUTHENTICATION_MIDDLEWARES.concat(removeBlueprintEntity))

export default entitiesRouter;
