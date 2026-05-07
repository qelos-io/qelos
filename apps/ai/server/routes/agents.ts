import { getRouter, populateUser, verifyUser } from '@qelos/api-kit';
import {
  agentChat,
  createAgent,
  deleteAgent,
  getAgent,
  listAgents,
  updateAgent,
} from '../controllers/agents';

export function agentsRouter() {
  const router = getRouter();

  const AUTHENTICATION_MIDDLEWARES = [populateUser, verifyUser];

  router
    .get('/api/ai/agents', AUTHENTICATION_MIDDLEWARES, listAgents)
    .post('/api/ai/agents', AUTHENTICATION_MIDDLEWARES, createAgent);

  router
    .get('/api/ai/agents/:id', AUTHENTICATION_MIDDLEWARES, getAgent)
    .put('/api/ai/agents/:id', AUTHENTICATION_MIDDLEWARES, updateAgent)
    .delete('/api/ai/agents/:id', AUTHENTICATION_MIDDLEWARES, deleteAgent);

  router
    .post('/api/ai/agents/:id/chat', AUTHENTICATION_MIDDLEWARES, agentChat)
    .get('/api/ai/agents/:id/chat', AUTHENTICATION_MIDDLEWARES, agentChat);

  return router;
}
