import { getRouter } from '@qelos/api-kit';

export function integrateToIntegrationsRouter() {
  const router = getRouter();

  // Chat completion endpoint has been moved to AI service
  // This router is now empty but kept for future integration endpoints
  
  return router;
}
