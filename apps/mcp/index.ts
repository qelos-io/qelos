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

const port = parseInt(String(process.env.MCP_SERVICE_PORT || process.env.PORT), 10) || 9010;

loadRoutes().then(() => {
  return start(
    'MCP Service',
    port,
    process.env.IP || '127.0.0.1',
  );
});
