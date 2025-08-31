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
  .get('/api/blueprints', AUTHENTICATION_MIDDLEWARES.concat(getAllBlueprints))
  .get('/api/blueprints/:blueprintIdentifier', AUTHENTICATION_MIDDLEWARES.concat(getSingleBlueprint))
  .post('/api/blueprints', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN.concat(createBlueprint))
  .put('/api/blueprints/:blueprintIdentifier', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN.concat(updateBlueprint))
  .patch('/api/blueprints/:blueprintIdentifier', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN.concat(patchBlueprint))
  .delete('/api/blueprints/:blueprintIdentifier', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN.concat(removeBlueprint))


blueprintsRouter
  .get('/internal-api/blueprints', verifyInternalCall, getAllBlueprints)

blueprintsRouter
  .get('/internal-api/blueprints/:blueprintIdentifier', verifyInternalCall, getSingleBlueprint)

blueprintsRouter
  .post('/internal-api/blueprints', verifyInternalCall, createBlueprint)

blueprintsRouter
  .put('/internal-api/blueprints/:blueprintIdentifier', verifyInternalCall, updateBlueprint)

blueprintsRouter
  .delete('/internal-api/blueprints/:blueprintIdentifier', verifyInternalCall, removeBlueprint)

blueprintsRouter
  .patch('/internal-api/blueprints/:blueprintIdentifier', verifyInternalCall, patchBlueprint)

export default blueprintsRouter;
