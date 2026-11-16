import { getRouter, verifyUser, populateUser } from '@qelos/api-kit';
import { onlyEditPrivileged } from '../middlewares/privileged-check';
import { createComponent, updateComponent, removeComponent, getAllComponents, getSingleComponent, getCompiledComponent, getComponentsList, bulkCreateOrUpdateComponents } from '../controllers/components';

const componentsRouter = getRouter();

// Legacy API kept for old SDKs; `/api/scripts` accepts both scripts and components.
const markDeprecated = (_req, res, next) => {
  res.set({ Deprecation: 'true', Link: '</api/scripts>; rel="successor-version"' });
  next();
};
componentsRouter.use('/api/components', markDeprecated);

const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser, onlyEditPrivileged]

componentsRouter
  .get('/api/components/:componentId', AUTHENTICATION_MIDDLEWARES.concat(getSingleComponent as any) as any[])
  .get('/api/components', AUTHENTICATION_MIDDLEWARES.concat(getAllComponents as any) as any[])
  .post('/api/components/bulk', AUTHENTICATION_MIDDLEWARES.concat(bulkCreateOrUpdateComponents as any) as any[])
  .post('/api/components', AUTHENTICATION_MIDDLEWARES.concat(createComponent as any) as any[])
  .put('/api/components/:componentId', AUTHENTICATION_MIDDLEWARES.concat(updateComponent as any) as any[])
  .delete('/api/components/:componentId', AUTHENTICATION_MIDDLEWARES.concat(removeComponent as any) as any[])

componentsRouter.get('/api/static', getComponentsList);
componentsRouter.get('/api/static/:componentKey(*)', getCompiledComponent);

export default componentsRouter;
