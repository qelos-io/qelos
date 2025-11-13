import { createThread, getThreads, getThread, deleteThread } from '../controllers/threads'
import { getRouter, populateUser, verifyUser } from '@qelos/api-kit';
import { checkEditPrivileged } from '../middlewares/privileged-check';

export const threadsRouter = () => {
  const router = getRouter()

  const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser];

  // Create a new thread for a specific integration
  router.post('/api/ai/threads', AUTHENTICATION_MIDDLEWARES, createThread)
  
  // Get all threads (optionally filtered by integration)
  router.get('/api/ai/threads', AUTHENTICATION_MIDDLEWARES, checkEditPrivileged, getThreads)
  
  // Get a specific thread
  router.get('/api/ai/threads/:threadId', AUTHENTICATION_MIDDLEWARES, checkEditPrivileged, getThread)
  
  // Delete a thread
  router.delete('/api/ai/threads/:threadId', AUTHENTICATION_MIDDLEWARES, checkEditPrivileged, deleteThread)

  return router
}
