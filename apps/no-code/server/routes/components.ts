import { getRouter, verifyUser, populateUser, verifyInternalCall } from '@qelos/api-kit';
import { onlyEditPrivileged } from '../middlewares/privileged-check';
import { createComponent, updateComponent, removeComponent, getAllComponents, getSingleComponent, getCompiledComponent, getComponentsList } from '../controllers/components';

const componentsRouter = getRouter();

const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser, onlyEditPrivileged]

componentsRouter
  .get('/api/components/:componentId', AUTHENTICATION_MIDDLEWARES.concat(getSingleComponent))
  .get('/api/components', AUTHENTICATION_MIDDLEWARES.concat(getAllComponents))
  .post('/api/components', AUTHENTICATION_MIDDLEWARES.concat(createComponent))
  .put('/api/components/:componentId', AUTHENTICATION_MIDDLEWARES.concat(updateComponent))
  .delete('/api/components/:componentId', AUTHENTICATION_MIDDLEWARES.concat(removeComponent))

componentsRouter.get('/internal-api/components', verifyInternalCall, getAllComponents);
componentsRouter.post('/internal-api/components', verifyInternalCall, createComponent);

componentsRouter.get('/api/static', getComponentsList);
componentsRouter.get('/api/static/:componentKey', getCompiledComponent);

export default componentsRouter;
