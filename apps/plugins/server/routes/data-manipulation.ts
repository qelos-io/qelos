import { getRouter, getBodyParser, verifyInternalCall, populateUser, verifyUser } from '@qelos/api-kit';
import { getDataManipulation } from '../controllers/data-manipulation';
import { onlyEditPrivilegedOrPlugin } from '../middlewares/privileged-check';

export function dataManipulationRouter() {
  const router = getRouter();

  const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser, onlyEditPrivilegedOrPlugin];

  router.post('/api/data-manipulation', AUTHENTICATION_MIDDLEWARES, getDataManipulation);
  router.post('/internal-api/data-manipulation', getBodyParser(), verifyInternalCall, getDataManipulation);
  return router;
}
