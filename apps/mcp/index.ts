import { start, config } from '@qelos/api-kit';
import { loadRoutes } from './server/routes';

process.on('uncaughtException', (err) => {
  console.error(err);
});

config({
  bodyParserOptions: {
    limit: '10mb',
  },
});

loadRoutes().then(() => {
  return start(
    'MCP Service',
    process.env.MCP_SERVICE_PORT || process.env.PORT || 9010,
    process.env.IP || '127.0.0.1',
  );
});
