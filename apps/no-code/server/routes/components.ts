import { getRouter, verifyUser, populateUser, verifyInternalCall } from '@qelos/api-kit';
import { onlyEditPrivileged } from '../middlewares/privileged-check';
import { createComponent, updateComponent, removeComponent, getAllComponents, getSingleComponent, getCompiledComponent, getComponentsList } from '../controllers/components';

const componentsRouter = getRouter();

const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser, onlyEditPrivileged]

componentsRouter
  .get('/api/components/:componentId', AUTHENTICATION_MIDDLEWARES.concat(getSingleComponent as any) as any[])
  .get('/api/components', AUTHENTICATION_MIDDLEWARES.concat(getAllComponents as any) as any[])
  .post('/api/components', AUTHENTICATION_MIDDLEWARES.concat(createComponent as any) as any[])
  .put('/api/components/:componentId', AUTHENTICATION_MIDDLEWARES.concat(updateComponent as any) as any[])
  .delete('/api/components/:componentId', AUTHENTICATION_MIDDLEWARES.concat(removeComponent as any) as any[])

const verifyInternal: any = verifyInternalCall

componentsRouter.get('/internal-api/components', verifyInternal, getAllComponents);
componentsRouter.post('/internal-api/components', verifyInternal, createComponent);
componentsRouter.get('/internal-api/components/:componentId', verifyInternal, getSingleComponent);
componentsRouter.put('/internal-api/components/:componentId', verifyInternal, updateComponent);

componentsRouter.get('/api/static', getComponentsList);
componentsRouter.get('/api/static/:componentKey(*)', getCompiledComponent);

export default componentsRouter;
