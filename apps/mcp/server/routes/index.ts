import { app as getApp } from '@qelos/api-kit';
import { mcpAdminRouter } from './mcp-admin';

export async function loadRoutes() {
  const app = getApp();
  app.use(mcpAdminRouter());
}
