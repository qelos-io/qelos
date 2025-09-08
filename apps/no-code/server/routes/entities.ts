import { getRouter, verifyUser, populateUser, verifyInternalCall } from '@qelos/api-kit';
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
  .get('/api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', AUTHENTICATION_MIDDLEWARES.concat(getSingleBlueprintEntity) as any[])
  .get('/api/blueprints/:blueprintIdentifier/entities', AUTHENTICATION_MIDDLEWARES.concat(getAllBlueprintEntities) as any[])
  .post('/api/blueprints/:blueprintIdentifier/entities', AUTHENTICATION_MIDDLEWARES.concat(createBlueprintEntity) as any[])
  .put('/api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', AUTHENTICATION_MIDDLEWARES.concat(updateBlueprintEntity) as any[])
  .delete('/api/blueprints/:blueprintIdentifier/entities/all', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN.concat(removeAllBlueprintEntities) as any[])
  .delete('/api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', AUTHENTICATION_MIDDLEWARES.concat(removeBlueprintEntity) as any[])

const internalVerify: any = verifyInternalCall;


entitiesRouter
  .get('/internal-api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', internalVerify, getBlueprintByIdentifierMiddleware, getSingleBlueprintEntity);

entitiesRouter
  .get('/internal-api/blueprints/:blueprintIdentifier/entities', internalVerify, getBlueprintByIdentifierMiddleware, getAllBlueprintEntities)

entitiesRouter
  .post('/internal-api/blueprints/:blueprintIdentifier/entities', internalVerify, getBlueprintByIdentifierMiddleware, createBlueprintEntity)

entitiesRouter
  .put('/internal-api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', internalVerify, getBlueprintByIdentifierMiddleware, updateBlueprintEntity)

entitiesRouter
  .delete('/internal-api/blueprints/:blueprintIdentifier/entities/all', internalVerify, getBlueprintByIdentifierMiddleware, removeAllBlueprintEntities)

entitiesRouter
  .delete('/internal-api/blueprints/:blueprintIdentifier/entities/:entityIdentifier', internalVerify, getBlueprintByIdentifierMiddleware, removeBlueprintEntity)

export default entitiesRouter;
