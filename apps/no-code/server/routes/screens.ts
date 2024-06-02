import { getRouter, verifyUser, populateUser } from '@qelos/api-kit';
import { onlyEditPrivileged } from '../middlewares/privileged-check';

const screensRouter = getRouter();

const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser]
const AUTHENTICATION_MIDDLEWARES_FOR_ADMIN = [populateUser, verifyUser, onlyEditPrivileged]

screensRouter
  .get('/api/screens', AUTHENTICATION_MIDDLEWARES)
  .get('/api/screens/:base64Identifier', AUTHENTICATION_MIDDLEWARES)
  .post('/api/screens', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN)
  .put('/api/screens/:base64Identifier', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN)
  .patch('/api/screens/:base64Identifier', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN)
  .delete('/api/screens/:base64Identifier', AUTHENTICATION_MIDDLEWARES_FOR_ADMIN)

export default screensRouter;
