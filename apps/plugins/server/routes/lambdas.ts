import { getRouter, getBodyParser, populateUser, verifyUser } from '@qelos/api-kit';
import { onlyAdminPrivileged } from '../middlewares/privileged-check';
import {
  listFunctions,
  getFunction,
  deleteFunction,
  updateFunction,
  createFunction,
} from '../controllers/lambdas';

export function lambdasRouter() {
  const router = getRouter();

  const AUTHENTICATION_MIDDLEWARES = [getBodyParser(), populateUser, verifyUser, onlyAdminPrivileged];

  router.get('/api/lambdas/:sourceId', AUTHENTICATION_MIDDLEWARES, listFunctions);
  router.post('/api/lambdas/:sourceId', AUTHENTICATION_MIDDLEWARES, createFunction);
  router.get('/api/lambdas/:sourceId/:functionName', AUTHENTICATION_MIDDLEWARES, getFunction);
  router.delete('/api/lambdas/:sourceId/:functionName', AUTHENTICATION_MIDDLEWARES, deleteFunction);
  router.put('/api/lambdas/:sourceId/:functionName', AUTHENTICATION_MIDDLEWARES, updateFunction);

  return router;
}
