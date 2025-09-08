import { getRouter, verifyUser, populateUser, verifyInternalCall } from '@qelos/api-kit';
import { checkAllPrivileges, onlyEditPrivileged } from '../middlewares/privileged-check';
import {
  createBlueprint,
  getAllBlueprints,
  getSingleBlueprint,
  patchBlueprint, removeBlueprint,
  updateBlueprint
} from '../controllers/blueprints';

const blueprintsRouter = getRouter();

const AUTHENTICATION_MIDDLEWARES = [populateUser, checkAllPrivileges, verifyUser]
const AUTHENTICATION_MIDDLEWARES_FOR_ADMIN = [populateUser, verifyUser, onlyEditPrivileged]

blueprintsRouter
  .get('/api/blueprints', AUTHENTICATION_MIDDLEWARES.concat(getAllBlueprints) as any[])
  .get('/api/blueprints/:blueprintIdentifier', AUTHENTICATION_MIDDLEWARES.concat(getSingleBlueprint) as any[])
  .post('/api/blueprints', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN.concat(createBlueprint) as any[])
  .put('/api/blueprints/:blueprintIdentifier', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN.concat(updateBlueprint) as any[])
  .patch('/api/blueprints/:blueprintIdentifier', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN.concat(patchBlueprint) as any[])
  .delete('/api/blueprints/:blueprintIdentifier', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN.concat(removeBlueprint) as any[])


const internalVerify: any = verifyInternalCall;

blueprintsRouter
  .get('/internal-api/blueprints', internalVerify, getAllBlueprints )

blueprintsRouter
  .get('/internal-api/blueprints/:blueprintIdentifier', internalVerify, getSingleBlueprint)

blueprintsRouter
  .post('/internal-api/blueprints', internalVerify, createBlueprint)

blueprintsRouter
  .put('/internal-api/blueprints/:blueprintIdentifier', internalVerify, updateBlueprint)

blueprintsRouter
  .delete('/internal-api/blueprints/:blueprintIdentifier', internalVerify, removeBlueprint)

blueprintsRouter
  .patch('/internal-api/blueprints/:blueprintIdentifier', internalVerify, patchBlueprint)

export default blueprintsRouter;
