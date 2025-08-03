import { createThread, getThreads, getThread, deleteThread } from '../controllers/thread'
import { getRouter, populateUser, verifyUser } from '@qelos/api-kit';

export const threadRouter = () => {
  const router = getRouter()

  const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser];

  // Create a new thread for a specific integration
  router.post('api/ai/threads', AUTHENTICATION_MIDDLEWARES, createThread)
  
  // Get all threads (optionally filtered by integration)
  router.get('api/ai/threads', AUTHENTICATION_MIDDLEWARES, getThreads)
  
  // Get a specific thread
  router.get('api/ai/threads/:threadId', AUTHENTICATION_MIDDLEWARES, getThread)
  
  // Delete a thread
  router.delete('api/ai/threads/:threadId', AUTHENTICATION_MIDDLEWARES, deleteThread)

  return router
}
