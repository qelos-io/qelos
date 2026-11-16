import { getRouter, verifyUser, populateUser, verifyInternalCall } from '@qelos/api-kit';
import { onlyEditPrivileged } from '../middlewares/privileged-check';
import { getCompiledScript } from '../controllers/scripts';
import { listAll, createOne, getOne, updateOne, removeOne, bulkUpsert } from '../controllers/scripts-api';

const scriptsRouter = getRouter();

const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser, onlyEditPrivileged]

scriptsRouter
  .get('/api/scripts/:scriptId', AUTHENTICATION_MIDDLEWARES.concat(getOne as any) as any[])
  .get('/api/scripts', AUTHENTICATION_MIDDLEWARES.concat(listAll as any) as any[])
  .post('/api/scripts/bulk', AUTHENTICATION_MIDDLEWARES.concat(bulkUpsert as any) as any[])
  .post('/api/scripts', AUTHENTICATION_MIDDLEWARES.concat(createOne as any) as any[])
  .put('/api/scripts/:scriptId', AUTHENTICATION_MIDDLEWARES.concat(updateOne as any) as any[])
  .delete('/api/scripts/:scriptId', AUTHENTICATION_MIDDLEWARES.concat(removeOne as any) as any[])

const verifyInternal: any = verifyInternalCall

scriptsRouter.get('/internal-api/scripts', verifyInternal, listAll);
scriptsRouter.post('/internal-api/scripts/bulk', verifyInternal, bulkUpsert);
scriptsRouter.post('/internal-api/scripts', verifyInternal, createOne);
scriptsRouter.get('/internal-api/scripts/:scriptId', verifyInternal, getOne);
scriptsRouter.put('/internal-api/scripts/:scriptId', verifyInternal, updateOne);

// must be registered before the components `/api/static/:componentKey(*)` catch-all
scriptsRouter.get('/api/static/scripts/:scriptKey(*)', getCompiledScript);

export default scriptsRouter;
